#!/usr/bin/env python3
"""
检查 sword2 在服务器上哪些文件缺失
"""
import os
import subprocess

GAME_ID = "d9eacebb-619c-46b8-ab92-c3ae47429eb6"
LOCAL_DIR = "/home/william/me/miu2d/resources-sword2-new"


def get_server_files():
    sql = (
        "WITH RECURSIVE tree(id, parent_id, name, path, type) AS ("
        "SELECT id, parent_id, name, name::text, type FROM files "
        f"WHERE game_id = '{GAME_ID}' AND parent_id IS NULL AND deleted_at IS NULL "
        "UNION ALL "
        "SELECT f.id, f.parent_id, f.name, tree.path || '/' || f.name, f.type "
        "FROM files f "
        "JOIN tree ON f.parent_id = tree.id "
        "WHERE f.deleted_at IS NULL"
        ") SELECT path FROM tree WHERE type = 'file';"
    )
    result = subprocess.run(
        ["ssh", "root@10.0.4.4",
         "docker exec -i miu2d-postgres psql -U postgres -d miu2d_db -t"],
        input=sql, capture_output=True, text=True, encoding="utf-8"
    )
    files = set()
    for line in result.stdout.splitlines():
        p = line.strip()
        if p:
            files.add(p.lower())
    return files


def get_local_files():
    skip_exts = {'.mpc', '.mpi', '.map', '.scc'}
    skip_dirs = {'mpc', 'save'}
    files = set()
    for root, dirs, filenames in os.walk(LOCAL_DIR):
        rel_root = os.path.relpath(root, LOCAL_DIR)
        top_dir = rel_root.split(os.sep)[0]
        if top_dir in skip_dirs:
            dirs.clear()
            continue
        for fn in filenames:
            _, ext = os.path.splitext(fn)
            if ext.lower() in skip_exts:
                continue
            if rel_root == '.':
                rel_path = fn
            else:
                rel_path = os.path.join(rel_root, fn)
            files.add(rel_path.lower().replace(os.sep, '/'))
    return files


print("Fetching server file list...")
server_files = get_server_files()
print(f"Server files: {len(server_files)}")

print("Building local file list...")
local_files = get_local_files()
print(f"Local files: {len(local_files)}")

missing = local_files - server_files
print(f"\nMissing from server: {len(missing)} files")
if missing:
    by_dir = {}
    for p in sorted(missing):
        d = p.rsplit('/', 1)[0] if '/' in p else ''
        by_dir.setdefault(d, []).append(p.rsplit('/', 1)[-1])
    for d, files in sorted(by_dir.items()):
        print(f"  [{d}] ({len(files)} files)")
        if len(files) <= 5:
            for f in files:
                print(f"    - {f}")
