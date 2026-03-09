#!/usr/bin/env python3
"""
fix-crosspack-tiles.py — 修复跨包引用的 tile 缺失问题

某些地图的 MMF 文件引用了来自其他贴图包的 tile（例如 临安城 用到了 百花谷小屋 的 tile）。
本脚本将：
1. 把源包中的 tile 复制到目标地图目录（本地文件系统）
2. 上传到远端 MinIO 并创建远端 DB 记录
3. 上传到本地 MinIO 并创建本地 DB 记录

不存在于任何位置的 tile 会被跳过并汇报（无法修复）：
  中都地下迷宫: 地板-综合-1.msf, 火把-1.msf
  大牢出口/大牢出口1: st02.msf, follow-02.msf, pp1.msf, pp2.msf, mubei.msf
  长安: 货旗.msf
"""

import hashlib
import mimetypes
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

import boto3
from botocore.config import Config

# ── 本地资源目录 ─────────────────────────────────────────────────────────────
LOCAL_RESOURCES = Path("/home/william/me/miu2d/resources-sword2-new")
MSF_MAP = LOCAL_RESOURCES / "msf" / "map"

# ── 远端环境 ──────────────────────────────────────────────────────────────────
REMOTE_MINIO = "http://10.0.4.4:9000"
REMOTE_GAME_ID = "d9eacebb-619c-46b8-ab92-c3ae47429eb6"
REMOTE_FOLDER_IDS = {
    "临安城": "680d38b4-9022-4745-8f8e-e8c221558016",
    "别离村": "8f774572-c338-459a-9ba8-a23132abb8ec",
    "天王岛": "1355e27b-eff2-41fd-bace-c5c7534d7131",
    "长安": "73091aa5-2359-48a8-a159-6ff0220ffc42",
}

# ── 本地环境 ──────────────────────────────────────────────────────────────────
LOCAL_MINIO = "http://localhost:9100"
LOCAL_GAME_ID = "b79a82f2-2aad-4e5e-9f3c-f22fd1c3d3cd"
LOCAL_FOLDER_IDS = {
    "临安城": "ed8e728b-5381-47e9-b8cf-399bd7ce22ac",
    "别离村": "db46a925-39a6-4ae3-9064-07b133c2ee77",
    "天王岛": "7ce96741-65bf-4364-9714-13715a6104f1",
    "长安": "20548e5e-9344-440d-8beb-af88d0dbc453",
}

MINIO_ACCESS_KEY = "minio"
MINIO_SECRET_KEY = "minio123"
MINIO_BUCKET = "miu2d"

# ── 跨包 tile 修复清单 ────────────────────────────────────────────────────────
# 格式: (目标地图, tile名称, 源包目录名称)
# tile名称 是目标地图期望的文件名（与 MMF 引用一致，大小写无关因为服务端 case-insensitive）
# 源包目录名称 是 msf/map/ 下已有该 tile 的子目录
CROSS_PACK_FIXES = [
    ("临安城", "wall-山寨房屋a.msf", "百花谷小屋"),
    ("临安城", "bigd-ysh.msf",      "凤池山庄"),
    ("别离村", "wall-乡村一般房屋.msf", "稻香村"),
    ("天王岛", "jiaju01.msf",        "中都"),       # 源文件是 JIAJU01.msf（大小写不影响服务端）
    ("天王岛", "sandG004.msf",       "临安城"),
    ("天王岛", "sandG006.msf",       "临安城"),
    ("天王岛", "sandG007.msf",       "临安城"),
    ("长安",   "water-蓝色普通.msf", "凤池山庄"),
    ("长安",   "Tree-ysh.msf",       "凤池山庄"),   # 源文件是 tree-ysh.msf
    ("长安",   "竹阴影1.msf",        "凤池山庄"),
    ("长安",   "竹阴影2.msf",        "凤池山庄"),
    ("长安",   "竹阴影3.msf",        "凤池山庄"),
    ("长安",   "竹阴影4.msf",        "凤池山庄"),
    ("长安",   "竹阴影5.msf",        "凤池山庄"),
]

# ── 工具函数 ─────────────────────────────────────────────────────────────────

def md5_file(path: Path) -> str:
    m = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            m.update(chunk)
    return m.hexdigest()


def find_case_insensitive(directory: Path, name: str) -> Path | None:
    """在 directory 中找到大小写无关的 name 文件，返回实际 Path 或 None。"""
    for f in directory.iterdir():
        if f.name.lower() == name.lower():
            return f
    return None


def make_s3_client(endpoint: str) -> boto3.client:
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def upload_to_minio(s3, local_path: Path, storage_key: str) -> None:
    mime, _ = mimetypes.guess_type(str(local_path))
    if mime is None:
        mime = "application/octet-stream"
    with open(local_path, "rb") as f:
        s3.put_object(Bucket=MINIO_BUCKET, Key=storage_key, Body=f, ContentType=mime)


def run_psql_remote(sql: str) -> str:
    """通过 SSH + stdin pipe 在远端 PostgreSQL 执行 SQL。"""
    result = subprocess.run(
        ["ssh", "root@10.0.4.4",
         "docker exec -i miu2d-postgres psql -U postgres -d miu2d_db -t"],
        input=sql,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        raise RuntimeError(f"remote psql error: {result.stderr}")
    return result.stdout.strip()


def run_psql_local(sql: str) -> str:
    """在本地 miu2d-postgres 容器中执行 SQL。"""
    result = subprocess.run(
        ["docker", "exec", "-i", "miu2d-postgres",
         "psql", "-U", "postgres", "-d", "miu2d_db", "-t"],
        input=sql,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        raise RuntimeError(f"local psql error: {result.stderr}")
    return result.stdout.strip()


def file_exists_in_db(psql_fn, game_id: str, folder_id: str, name: str) -> bool:
    """检查 DB 中是否已有同名文件（大小写不敏感）。"""
    escaped = name.replace("'", "''").lower()
    sql = (
        f"SELECT 1 FROM files WHERE game_id='{game_id}' "
        f"AND parent_id='{folder_id}' AND LOWER(name)='{escaped}' "
        f"AND type='file' AND deleted_at IS NULL LIMIT 1;"
    )
    out = psql_fn(sql)
    return bool(out.strip())


def insert_file_record(psql_fn, game_id: str, folder_id: str, name: str,
                        storage_key: str, size: int, checksum: str) -> None:
    file_id = str(uuid.uuid4())
    escaped = name.replace("'", "''")
    mime, _ = mimetypes.guess_type(name)
    if mime is None:
        mime = "application/octet-stream"
    sql = (
        f"INSERT INTO files (id, game_id, parent_id, name, type, storage_key, size, mime_type, checksum) "
        f"VALUES ('{file_id}', '{game_id}', '{folder_id}', '{escaped}', 'file', "
        f"'{storage_key}', {size}, '{mime}', '{checksum}');"
    )
    psql_fn(sql)


def process_env(
    label: str,
    s3,
    game_id: str,
    folder_ids: dict[str, str],
    psql_fn,
    local_path: Path,
    dest_map: str,
    tile_name: str,
) -> None:
    """在指定环境（远端或本地）中上传 tile 并创建 DB 记录。"""
    folder_id = folder_ids[dest_map]

    # 检查是否已存在
    if file_exists_in_db(psql_fn, game_id, folder_id, tile_name):
        print(f"    [{label}] ⏭ 跳过 {tile_name}（DB 已存在）")
        return

    # 上传到 MinIO
    file_id = str(uuid.uuid4())
    storage_key = f"{game_id}/{file_id}"
    upload_to_minio(s3, local_path, storage_key)

    # 创建 DB 记录
    size = local_path.stat().st_size
    checksum = md5_file(local_path)
    insert_file_record(psql_fn, game_id, folder_id, tile_name,
                       storage_key, size, checksum)
    print(f"    [{label}] ✓ 上传 {tile_name} ({size} bytes, key={file_id[:8]}...)")


def main():
    print("=== fix-crosspack-tiles.py ===")
    print(f"本地资源目录: {LOCAL_RESOURCES}")

    # 初始化 S3 客户端
    remote_s3 = make_s3_client(REMOTE_MINIO)
    local_s3 = make_s3_client(LOCAL_MINIO)

    # 验证连接
    for label, s3 in [("remote", remote_s3), ("local", local_s3)]:
        try:
            s3.head_bucket(Bucket=MINIO_BUCKET)
            print(f"✓ {label} MinIO 连接正常")
        except Exception as e:
            print(f"✗ {label} MinIO 连接失败: {e}")
            sys.exit(1)

    errors: list[str] = []

    for dest_map, tile_name, source_pack in CROSS_PACK_FIXES:
        print(f"\n[{dest_map}] {tile_name}")
        print(f"  源包: {source_pack}")

        # 1. 在源包目录中找到实际文件（大小写不敏感）
        source_dir = MSF_MAP / source_pack
        if not source_dir.is_dir():
            msg = f"  错误: 源包目录不存在: {source_dir}"
            print(msg)
            errors.append(msg)
            continue

        source_file = find_case_insensitive(source_dir, tile_name)
        if source_file is None:
            msg = f"  错误: 在 {source_pack}/ 中找不到 {tile_name}"
            print(msg)
            errors.append(msg)
            continue

        print(f"  源文件: {source_file.name}")

        # 2. 复制到目标地图目录（本地文件系统）
        dest_dir = MSF_MAP / dest_map
        dest_file = dest_dir / tile_name  # 使用 MMF 期望的名称

        if not dest_file.exists():
            # 先检查大小写变体
            existing = find_case_insensitive(dest_dir, tile_name)
            if existing:
                print(f"  本地: 已存在 {existing.name}（大小写不同，跳过复制）")
                local_path = existing
            else:
                shutil.copy2(source_file, dest_file)
                print(f"  本地: 已复制到 {dest_dir.name}/{tile_name}")
                local_path = dest_file
        else:
            print(f"  本地: 已存在 {tile_name}（跳过复制）")
            local_path = dest_file

        # 3. 上传到远端
        process_env("remote", remote_s3, REMOTE_GAME_ID, REMOTE_FOLDER_IDS,
                    run_psql_remote, local_path, dest_map, tile_name)

        # 4. 上传到本地 MinIO
        process_env("local", local_s3, LOCAL_GAME_ID, LOCAL_FOLDER_IDS,
                    run_psql_local, local_path, dest_map, tile_name)

    print("\n=== 汇总 ===")
    if errors:
        print(f"⚠ 发现 {len(errors)} 个错误:")
        for e in errors:
            print(f"  {e}")
    else:
        print("✓ 全部完成，无错误")

    print("\n=== 无法修复的 tile（游戏原始数据缺失）===")
    print("  中都地下迷宫: 地板-综合-1.msf, 火把-1.msf")
    print("  大牢出口/大牢出口1: st02.msf, follow-02.msf, pp1.msf, pp2.msf, mubei.msf")
    print("  长安: 货旗.msf")


if __name__ == "__main__":
    main()
