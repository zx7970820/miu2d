#!/usr/bin/env python3
"""
从 MinIO 文件列表生成 SQL 插入语句
"""

import sys
import re
from pathlib import Path

def parse_line(line):
    """解析 mc ls 输出的一行"""
    # 格式: [2026-03-23 17:26:29 CST] 293KiB STANDARD C5.dll
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
        print("Usage: python3 generate-sql.py <game_id> <input_file>")
        sys.exit(1)
    
    game_id = sys.argv[1]
    input_file = sys.argv[2]
    
    # 用于跟踪已创建的文件夹（路径 -> 临时变量名）
    folders = {}
    folder_counter = 0
    
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            file_path = parse_line(line)
            if not file_path:
                continue
            
            # 提取文件名和路径
            parts = file_path.split('/')
            filename = parts[-1]
            
            # 创建父文件夹记录
            for i in range(len(parts) - 1):
                folder_path = '/'.join(parts[:i+1])
                if folder_path not in folders:
                    folder_name = parts[i]
                    parent_path = '/'.join(parts[:i]) if i > 0 else ''
                    folder_var = f"folder_{folder_counter}"
                    folder_counter += 1
                    
                    print(f"-- Folder: {folder_path}")
                    print(f"WITH {folder_var} AS (")
                    print(f"  INSERT INTO files (id, game_id, name, type, parent_id, created_at, updated_at)")
                    print(f"  SELECT gen_random_uuid(), '{game_id}', '{folder_name}', 'folder',")
                    if parent_path and parent_path in folders:
                        parent_var = folders[parent_path]
                        print(f"    (SELECT id FROM {parent_var}),")
                    else:
                        print(f"    NULL,")
                    print(f"    NOW(), NOW()")
                    print(f"  WHERE NOT EXISTS (")
                    print(f"    SELECT 1 FROM files WHERE game_id = '{game_id}' AND name = '{folder_name}'")
                    if parent_path and parent_path in folders:
                        parent_var = folders[parent_path]
                        print(f"    AND parent_id = (SELECT id FROM {parent_var})")
                    else:
                        print(f"    AND parent_id IS NULL")
                    print(f"  )")
                    print(f"  RETURNING id")
                    print(f")")
                    print(f"SELECT * FROM {folder_var};")
                    print()
                    
                    folders[folder_path] = folder_var
            
            # 创建文件记录
            storage_key = f"game/enozheng123-gmail-com/resources/{file_path}"
            mime_type = get_mime_type(filename)
            parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else ''
            
            print(f"-- File: {file_path}")
            print(f"INSERT INTO files (id, game_id, name, type, storage_key, mime_type, parent_id, created_at, updated_at)")
            print(f"SELECT gen_random_uuid(), '{game_id}', '{filename}', 'file',")
            print(f"  '{storage_key}', '{mime_type}',")
            if parent_path and parent_path in folders:
                parent_var = folders[parent_path]
                print(f"  (SELECT id FROM {parent_var}),")
            else:
                print(f"  NULL,")
            print(f"  NOW(), NOW()")
            print(f"WHERE NOT EXISTS (")
            print(f"  SELECT 1 FROM files WHERE game_id = '{game_id}' AND name = '{filename}'")
            if parent_path and parent_path in folders:
                parent_var = folders[parent_path]
                print(f"  AND parent_id = (SELECT id FROM {parent_var})")
            else:
                print(f"  AND parent_id IS NULL")
            print(f");")
            print()

if __name__ == '__main__':
    main()
