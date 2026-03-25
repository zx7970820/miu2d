#!/usr/bin/env python3
"""
从 MinIO 文件列表生成 SQL 插入语句（批量版本，避免子查询）
使用 CTE 和批量插入来提高性能和可靠性
"""

import sys
import re
from pathlib import Path
from collections import defaultdict

def parse_line(line):
    """解析 mc ls 输出的一行"""
    match = re.match(r'\[.*?\]\s+\S+\s+\S+\s+(.+)', line.strip())
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
        print("Usage: python3 generate-sql-batch.py <game_id> <input_file>")
        sys.exit(1)
    
    game_id = sys.argv[1]
    input_file = sys.argv[2]
    
    # 收集所有文件路径
    all_files = []
    folder_tree = defaultdict(list)  # parent_path -> [child_folders]
    
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            file_path = parse_line(line)
            if not file_path:
                continue
            all_files.append(file_path)
            
            # 构建文件夹树
            parts = file_path.split('/')
            for i in range(len(parts) - 1):
                folder_path = '/'.join(parts[:i+1])
                parent_path = '/'.join(parts[:i]) if i > 0 else ''
                if folder_path not in folder_tree[parent_path]:
                    folder_tree[parent_path].append(folder_path)
    
    # 按层级组织文件夹
    folders_by_level = defaultdict(list)
    for folder_path in set(sum(folder_tree.values(), [])):
        level = folder_path.count('/')
        folders_by_level[level].append(folder_path)
    
    print("-- 删除现有数据（如果需要）")
    print(f"-- DELETE FROM files WHERE game_id = '{game_id}';")
    print()
    
    # 逐层创建文件夹
    max_level = max(folders_by_level.keys()) if folders_by_level else 0
    
    for level in range(max_level + 1):
        if level not in folders_by_level:
            continue
        
        folders = sorted(folders_by_level[level])
        print(f"-- 第 {level + 1} 层文件夹 ({len(folders)} 个)")
        
        for folder_path in folders:
            parts = folder_path.split('/')
            folder_name = parts[-1].replace("'", "''")
            parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else None
            
            print(f"INSERT INTO files (id, game_id, name, type, parent_id, created_at, updated_at)")
            print(f"SELECT gen_random_uuid(), '{game_id}', '{folder_name}', 'folder',", end='')
            
            if parent_path:
                parent_name = parent_path.split('/')[-1].replace("'", "''")
                # 使用 LIMIT 1 避免多行错误
                print(f" (SELECT id FROM files WHERE game_id = '{game_id}' AND name = '{parent_name}' AND type = 'folder' LIMIT 1),", end='')
            else:
                print(f" NULL,", end='')
            
            print(f" NOW(), NOW()")
            print(f"WHERE NOT EXISTS (")
            print(f"  SELECT 1 FROM files WHERE game_id = '{game_id}' AND name = '{folder_name}' AND type = 'folder'", end='')
            if parent_path:
                print(f" AND parent_id = (SELECT id FROM files WHERE game_id = '{game_id}' AND name = '{parent_name}' AND type = 'folder' LIMIT 1)", end='')
            else:
                print(f" AND parent_id IS NULL", end='')
            print(f");")
        
        print()
    
    # 创建文件（分批处理）
    print(f"-- 创建文件 ({len(all_files)} 个)")
    print()
    
    batch_size = 100
    for i in range(0, len(all_files), batch_size):
        batch = all_files[i:i+batch_size]
        print(f"-- 批次 {i//batch_size + 1} ({len(batch)} 个文件)")
        
        for file_path in batch:
            parts = file_path.split('/')
            filename = parts[-1].replace("'", "''")
            parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else None
            storage_key = f"game/enozheng123-gmail-com/resources/{file_path}"
            mime_type = get_mime_type(filename)
            
            print(f"INSERT INTO files (id, game_id, name, type, storage_key, mime_type, parent_id, created_at, updated_at)")
            print(f"SELECT gen_random_uuid(), '{game_id}', '{filename}', 'file', '{storage_key}', '{mime_type}',", end='')
            
            if parent_path:
                parent_name = parent_path.split('/')[-1].replace("'", "''")
                print(f" (SELECT id FROM files WHERE game_id = '{game_id}' AND name = '{parent_name}' AND type = 'folder' LIMIT 1),", end='')
            else:
                print(f" NULL,", end='')
            
            print(f" NOW(), NOW()")
            print(f"WHERE NOT EXISTS (")
            print(f"  SELECT 1 FROM files WHERE game_id = '{game_id}' AND name = '{filename}' AND type = 'file' AND storage_key = '{storage_key}'")
            print(f");")
        
        print()
    
    print("-- 完成")

if __name__ == '__main__':
    main()
