#!/usr/bin/env python3
"""
从 MinIO 文件列表生成 SQL 插入语句（简化版）
先创建所有文件夹，再创建文件
"""

import sys
import re
from pathlib import Path

def parse_line(line):
    """解析 mc ls 输出的一行"""
    match = re.match(r'\[.*?\]\s+\S+\s+\S+\s+(.+)$', line.strip())
    if match:
        return match.group(1)
    return None

def get_mime_type(filename):
    """根据文件扩展名返回 MIME 类型"""
    ext = Path(filename).suffix.lower()
    mime_types = {
        '.msf': 'application/octet-stream',
        '.mmf': 'application/octet-stream',
        '.txt': 'text/plain',
        '.ini': 'text/plain',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.wma': 'audio/x-ms-wma',
        '.xnb': 'application/octet-stream',
        '.dll': 'application/octet-stream',
    }
    return mime_types.get(ext, 'application/octet-stream')

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 generate-sql-simple.py <game_id> <input_file>")
        sys.exit(1)
    
    game_id = sys.argv[1]
    input_file = sys.argv[2]
    
    # 收集所有文件路径
    all_files = []
    all_folders = set()
    
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            file_path = parse_line(line)
            if not file_path:
                continue
            all_files.append(file_path)
            
            # 收集所有父文件夹
            parts = file_path.split('/')
            for i in range(len(parts) - 1):
                folder_path = '/'.join(parts[:i+1])
                all_folders.add(folder_path)
    
    # 按层级排序文件夹（浅到深）
    sorted_folders = sorted(all_folders, key=lambda x: x.count('/'))
    
    print("-- 第一步：创建所有文件夹")
    print("BEGIN;")
    print()
    
    for folder_path in sorted_folders:
        parts = folder_path.split('/')
        folder_name = parts[-1].replace("'", "''")  # 转义单引号
        parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else None
        
        print(f"-- Folder: {folder_path}")
        print(f"INSERT INTO files (id, game_id, name, type, parent_id, created_at, updated_at)")
        print(f"VALUES (")
        print(f"  gen_random_uuid(),")
        print(f"  '{game_id}',")
        print(f"  '{folder_name}',")
        print(f"  'folder',")
        if parent_path:
            # 通过名称和父ID查找
            parent_parts = parent_path.split('/')
            parent_name = parent_parts[-1]
            grandparent_path = '/'.join(parent_parts[:-1]) if len(parent_parts) > 1 else None
            
            print(f"  (SELECT id FROM files WHERE game_id = '{game_id}' AND name = '{parent_name}' AND type = 'folder'", end='')
            if grandparent_path:
                grandparent_name = grandparent_path.split('/')[-1]
                print(f" AND parent_id = (SELECT id FROM files WHERE game_id = '{game_id}' AND name = '{grandparent_name}' AND type = 'folder')", end='')
            else:
                print(f" AND parent_id IS NULL", end='')
            print(f"),")
        else:
            print(f"  NULL,")
        print(f"  NOW(),")
        print(f"  NOW()")
        print(f");")
        print()
    
    print("-- 第二步：创建所有文件")
    print()
    
    for file_path in all_files:
        parts = file_path.split('/')
        filename = parts[-1].replace("'", "''")  # 转义单引号
        parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else None
        storage_key = f"game/enozheng123-gmail-com/resources/{file_path}"
        mime_type = get_mime_type(filename)
        
        print(f"-- File: {file_path}")
        print(f"INSERT INTO files (id, game_id, name, type, storage_key, mime_type, parent_id, created_at, updated_at)")
        print(f"VALUES (")
        print(f"  gen_random_uuid(),")
        print(f"  '{game_id}',")
        print(f"  '{filename}',")
        print(f"  'file',")
        print(f"  '{storage_key}',")
        print(f"  '{mime_type}',")
        if parent_path:
            parent_name = parent_path.split('/')[-1]
            print(f"  (SELECT id FROM files WHERE game_id = '{game_id}' AND name = '{parent_name}' AND type = 'folder'),")
        else:
            print(f"  NULL,")
        print(f"  NOW(),")
        print(f"  NOW()")
        print(f");")
        print()
    
    print("COMMIT;")

if __name__ == '__main__':
    main()
