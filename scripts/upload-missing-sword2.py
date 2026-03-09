#!/usr/bin/env python3
"""
upload-missing-sword2.py — 上传 sword2 缺失的 msf/map/龙门客栈-长安/ 目录到 MinIO 并创建数据库记录

直接操作 MinIO + PostgreSQL（绕过 tRPC，因为需要管理员凭据）
使用方式:
    python3 scripts/upload-missing-sword2.py
"""

import hashlib
import mimetypes
import os
import subprocess
import sys
import uuid
from pathlib import Path

import boto3
from botocore.config import Config

# ── 配置 ────────────────────────────────────────────────────────────────────
MINIO_ENDPOINT = "http://10.0.4.4:9000"
MINIO_ACCESS_KEY = "minio"
MINIO_SECRET_KEY = "minio123"
MINIO_BUCKET = "miu2d"

GAME_ID = "d9eacebb-619c-46b8-ab92-c3ae47429eb6"  # sword2

# msf/map 在 DB 中的 folder ID
MSF_MAP_FOLDER_ID = "a695c316-2ce0-41bf-a639-1bec5ea0cc70"

# 本地转换后的资源目录
LOCAL_RESOURCES = Path("/home/william/me/miu2d/resources-sword2-new")

# SSH 命令前缀（用于执行远程 psql）
SSH_PREFIX = ["ssh", "root@10.0.4.4"]

# ── S3 客户端 ─────────────────────────────────────────────────────────────────
s3 = boto3.client(
    "s3",
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    config=Config(signature_version="s3v4"),
    region_name="us-east-1",
)


def md5_file(path: Path) -> str:
    m = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            m.update(chunk)
    return m.hexdigest()


def upload_file_to_minio(local_path: Path, storage_key: str) -> None:
    """把本地文件上传到 MinIO。"""
    mime, _ = mimetypes.guess_type(str(local_path))
    if mime is None:
        mime = "application/octet-stream"
    with open(local_path, "rb") as f:
        s3.put_object(
            Bucket=MINIO_BUCKET,
            Key=storage_key,
            Body=f,
            ContentType=mime,
        )
    print(f"  ✓ 上传 s3://{MINIO_BUCKET}/{storage_key}")


def _run_psql(sql: str) -> subprocess.CompletedProcess:
    """通过 SSH + stdin pipe 执行 SQL（避免 shell 引号问题，支持中文和单引号）。"""
    result = subprocess.run(
        ["ssh", "root@10.0.4.4",
         "docker exec -i miu2d-postgres psql -U postgres -d miu2d_db -t"],
        input=sql,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return result


def psql(sql: str) -> str:
    """通过 SSH 在远程 PostgreSQL 执行 SQL，返回输出。"""
    result = _run_psql(sql)
    if result.returncode != 0:
        raise RuntimeError(f"psql error: {result.stderr}")
    return result.stdout.strip()


def psql_insert(sql: str) -> None:
    """通过 SSH 执行 INSERT 语句（支持中文）。"""
    result = _run_psql(sql)
    if result.returncode != 0:
        raise RuntimeError(f"psql error: {result.stderr}\n{result.stdout}")


def folder_exists(parent_id: str, name: str) -> str | None:
    """检查指定父目录下是否存在同名文件夹，返回 ID 或 None。"""
    sql = (
        f"SELECT id FROM files WHERE game_id='{GAME_ID}' "
        f"AND parent_id='{parent_id}' AND name='{name}' AND type='folder' "
        f"AND deleted_at IS NULL LIMIT 1"
    )
    out = psql(sql)
    return out if out else None


def file_exists(parent_id: str, name: str) -> bool:
    """检查指定父目录下是否存在同名文件。"""
    sql = (
        f"SELECT 1 FROM files WHERE game_id='{GAME_ID}' "
        f"AND parent_id='{parent_id}' AND name='{name}' "
        f"AND deleted_at IS NULL LIMIT 1"
    )
    out = psql(sql)
    return bool(out)


def create_folder(parent_id: str, name: str) -> str:
    """创建文件夹记录，返回新 ID。"""
    folder_id = str(uuid.uuid4())
    escaped = name.replace("'", "''")
    sql = (
        f"INSERT INTO files (id, game_id, parent_id, name, type) "
        f"VALUES ('{folder_id}', '{GAME_ID}', '{parent_id}', '{escaped}', 'folder')"
    )
    psql_insert(sql)
    return folder_id


def create_file_record(parent_id: str, name: str, storage_key: str, size: int, checksum: str) -> str:
    """创建文件记录，返回新 ID。"""
    file_id = str(uuid.uuid4())
    escaped = name.replace("'", "''")
    mime, _ = mimetypes.guess_type(name)
    if mime is None:
        mime = "application/octet-stream"
    sql = (
        f"INSERT INTO files (id, game_id, parent_id, name, type, storage_key, size, mime_type, checksum) "
        f"VALUES ('{file_id}', '{GAME_ID}', '{parent_id}', '{escaped}', 'file', "
        f"'{storage_key}', '{size}', '{mime}', '{checksum}')"
    )
    psql_insert(sql)
    return file_id


def upload_directory(local_dir: Path, db_parent_folder_id: str, relative_path: str) -> None:
    """递归上传目录下的所有文件。"""
    dir_name = local_dir.name
    print(f"\n[目录] {relative_path}/{dir_name}")

    # 创建或复用 DB 文件夹记录
    existing_id = folder_exists(db_parent_folder_id, dir_name)
    if existing_id:
        folder_id = existing_id
        print(f"  → 文件夹已存在 (id={folder_id[:8]}...)")
    else:
        folder_id = create_folder(db_parent_folder_id, dir_name)
        print(f"  → 创建文件夹 (id={folder_id[:8]}...)")

    # 上传所有文件
    for entry in sorted(local_dir.iterdir()):
        if entry.is_file():
            upload_single_file(entry, folder_id, f"{relative_path}/{dir_name}")
        elif entry.is_dir():
            upload_directory(entry, folder_id, f"{relative_path}/{dir_name}")


def upload_single_file(local_path: Path, db_parent_folder_id: str, relative_path: str) -> None:
    """上传单个文件到 MinIO 并创建 DB 记录。"""
    name = local_path.name
    size = local_path.stat().st_size
    checksum = md5_file(local_path)

    if file_exists(db_parent_folder_id, name):
        print(f"  ⏭ 跳过（已存在） {relative_path}/{name}")
        return

    # 生成临时 file_id 用作 storage_key
    file_id = str(uuid.uuid4())
    storage_key = f"{GAME_ID}/{file_id}"

    # 上传到 MinIO
    upload_file_to_minio(local_path, storage_key)

    # 创建 DB 记录（使用确定性 ID）
    final_id = str(uuid.uuid4())
    escaped = name.replace("'", "''")
    mime, _ = mimetypes.guess_type(name)
    if mime is None:
        mime = "application/octet-stream"
    sql = (
        f"INSERT INTO files (id, game_id, parent_id, name, type, storage_key, size, mime_type, checksum) "
        f"VALUES ('{final_id}', '{GAME_ID}', '{db_parent_folder_id}', '{escaped}', 'file', "
        f"'{storage_key}', '{size}', '{mime}', '{checksum}')"
    )
    psql_insert(sql)
    print(f"  ✓ 记录创建 {relative_path}/{name} ({size} bytes)")


def main():
    print("=== sword2 缺失资源上传脚本 ===")
    print(f"GameID: {GAME_ID}")
    print(f"MinIO: {MINIO_ENDPOINT}")
    print()

    # 验证 MinIO 连接
    try:
        s3.head_bucket(Bucket=MINIO_BUCKET)
        print(f"✓ MinIO 连接正常，bucket={MINIO_BUCKET}")
    except Exception as e:
        print(f"✗ MinIO 连接失败: {e}")
        sys.exit(1)

    # 1. 上传 msf/map/龙门客栈-长安
    target_dir = LOCAL_RESOURCES / "msf" / "map" / "龙门客栈-长安"
    if not target_dir.is_dir():
        print(f"✗ 本地目录不存在: {target_dir}")
        sys.exit(1)

    print(f"\n--- 上传 msf/map/龙门客栈-长安 ({len(list(target_dir.iterdir()))} 个文件) ---")
    upload_directory(target_dir, MSF_MAP_FOLDER_ID, "msf/map")

    print("\n=== 完成 ===")


if __name__ == "__main__":
    main()
