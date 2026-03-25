#!/usr/bin/env python3
"""
生成创建所有缺失文件夹的 SQL
从 MinIO 文件列表中提取完整的文件夹层级
"""

import sys
import re

def parse_line(line):
    """解析 mc ls 输出的一行"""
    match = re.match(r'\[.*?\]\s+\S+\s+\S+\s+(.+)', line.strip())
    if match:
        return match.group(1)
    return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 generate-folder-sql.py <game_id>")
        sys.exit(1)
    
    game_id = sys.argv[1]
    input_file = '/tmp/minio-files.txt'
    
    # 收集所有文件夹路径
    all_folders = set()
    
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            file_path = parse_line(line)
            if not file_path:
                continue
            
            # 提取所有父文件夹
            parts = file_path.split('/')
            for i in range(len(parts) - 1):
                folder_path = '/'.join(parts[:i+1])
                all_folders.add(folder_path)
    
    # 按层级排序（从浅到深）
    sorted_folders = sorted(all_folders, key=lambda x: (x.count('/'), x))
    
    # 构建文件夹层级映射
    folder_to_parent = {}
    for folder_path in sorted_folders:
        parts = folder_path.split('/')
        if len(parts) > 1:
            parent_path = '/'.join(parts[:-1])
            folder_to_parent[folder_path] = parent_path
        else:
            folder_to_parent[folder_path] = None
    
    print("-- 创建所有文件夹（按层级）")
    print("BEGIN;")
    print()
    
    # 按层级创建文件夹
    for folder_path in sorted_folders:
        parts = folder_path.split('/')
        folder_name = parts[-1].replace("'", "''")
        parent_path = folder_to_parent[folder_path]
        
        print(f"-- {folder_path}")
        print(f"DO $$")
        print(f"DECLARE")
        print(f"  v_parent_id UUID;")
        print(f"BEGIN")
        
        if parent_path:
            # 查找父文件夹ID
            parent_parts = parent_path.split('/')
            parent_name = parent_parts[-1].replace("'", "''")
            
            if len(parent_parts) == 1:
                # 父文件夹在根级别
                print(f"  SELECT id INTO v_parent_id")
                print(f"  FROM files")
                print(f"  WHERE game_id = '{game_id}'")
                print(f"    AND name = '{parent_name}'")
                print(f"    AND type = 'folder'")
                print(f"    AND parent_id IS NULL")
                print(f"  LIMIT 1;")
            else:
                # 父文件夹有祖父文件夹
                grandparent_path = '/'.join(parent_parts[:-1])
                grandparent_name = grandparent_path.split('/')[-1].replace("'", "''")
                
                print(f"  SELECT f.id INTO v_parent_id")
                print(f"  FROM files f")
                print(f"  WHERE f.game_id = '{game_id}'")
                print(f"    AND f.name = '{parent_name}'")
                print(f"    AND f.type = 'folder'")
                print(f"    AND f.parent_id = (")
                print(f"      SELECT id FROM files")
                print(f"      WHERE game_id = '{game_id}'")
                print(f"        AND name = '{grandparent_name}'")
                print(f"        AND type = 'folder'")
                print(f"      LIMIT 1")
                print(f"    )")
                print(f"  LIMIT 1;")
        
        # 插入文件夹（如果不存在）
        print(f"  IF NOT EXISTS (")
        print(f"    SELECT 1 FROM files")
        print(f"    WHERE game_id = '{game_id}'")
        print(f"      AND name = '{folder_name}'")
        print(f"      AND type = 'folder'")
        if parent_path:
            print(f"      AND parent_id = v_parent_id")
        else:
            print(f"      AND parent_id IS NULL")
        print(f"  ) THEN")
        print(f"    INSERT INTO files (id, game_id, name, type, parent_id, created_at, updated_at)")
        print(f"    VALUES (")
        print(f"      gen_random_uuid(),")
        print(f"      '{game_id}',")
        print(f"      '{folder_name}',")
        print(f"      'folder',")
        if parent_path:
            print(f"      v_parent_id,")
        else:
            print(f"      NULL,")
        print(f"      NOW(),")
        print(f"      NOW()")
        print(f"    );")
        print(f"  END IF;")
        print(f"END $$;")
        print()
    
    print("COMMIT;")
    print()
    print(f"-- 验证文件夹数量")
    print(f"SELECT COUNT(*) as folder_count FROM files WHERE game_id = '{game_id}' AND type = 'folder';")

if __name__ == '__main__':
    main()
