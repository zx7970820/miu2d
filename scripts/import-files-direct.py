#!/usr/bin/env python3
"""
直接通过 psycopg2 导入文件到数据库
"""

import sys
import re
from pathlib import Path
import subprocess

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

def exec_sql(sql):
    """执行 SQL 并返回结果"""
    result = subprocess.run(
        ['docker', 'exec', '-i', 'miu2d-postgres', 'psql', '-U', 'postgres', '-d', 'miu2d_db', '-t', '-c', sql],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 import-files-direct.py <game_id> <input_file>")
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
    
    # 用于缓存文件夹 ID
    folder_ids = {}
    
    print(f"Creating {len(sorted_folders)} folders...")
    
    # 创建文件夹
    for i, folder_path in enumerate(sorted_folders):
        parts = folder_path.split('/')
        folder_name = parts[-1].replace("'", "''")
        parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else None
        parent_id = folder_ids.get(parent_path) if parent_path else None
        
        sql = f"""
        INSERT INTO files (id, game_id, name, type, parent_id, created_at, updated_at)
        VALUES (gen_random_uuid(), '{game_id}', '{folder_name}', 'folder', 
                {f"'{parent_id}'" if parent_id else 'NULL'}, NOW(), NOW())
        RETURNING id;
        """
        
        folder_id = exec_sql(sql)
        folder_ids[folder_path] = folder_id
        
        if (i + 1) % 100 == 0:
            print(f"  Progress: {i + 1}/{len(sorted_folders)} folders")
    
    print(f"\nCreating {len(all_files)} files...")
    
    # 创建文件
    for i, file_path in enumerate(all_files):
        parts = file_path.split('/')
        filename = parts[-1].replace("'", "''")
        parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else None
        parent_id = folder_ids.get(parent_path) if parent_path else None
        storage_key = f"game/enozheng123-gmail-com/resources/{file_path}"
        mime_type = get_mime_type(filename)
        
        sql = f"""
        INSERT INTO files (id, game_id, name, type, storage_key, mime_type, parent_id, created_at, updated_at)
        VALUES (gen_random_uuid(), '{game_id}', '{filename}', 'file', 
                '{storage_key}', '{mime_type}', 
                {f"'{parent_id}'" if parent_id else 'NULL'}, NOW(), NOW());
        """
        
        exec_sql(sql)
        
        if (i + 1) % 100 == 0:
            print(f"  Progress: {i + 1}/{len(all_files)} files")
    
    print(f"\nDone! Created {len(sorted_folders)} folders and {len(all_files)} files.")

if __name__ == '__main__':
    main()
