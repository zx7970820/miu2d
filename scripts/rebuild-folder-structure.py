#!/usr/bin/env python3
"""
重建完整的文件夹结构
从所有文件的 storage_key 中提取路径，创建缺失的文件夹，并更新文件的 parent_id
"""

import sys
import psycopg2
from collections import defaultdict

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 rebuild-folder-structure.py <game_id>", file=sys.stderr)
        sys.exit(1)
    
    game_id = sys.argv[1]
    
    # 连接数据库（通过 Docker 容器）
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='miu2d_db',
        user='postgres',
        password='postgres'
    )
    cur = conn.cursor()
    
    try:
        # 1. 获取所有文件的 storage_key
        print("正在获取所有文件的路径...", file=sys.stderr)
        cur.execute("""
            SELECT id, storage_key
            FROM files
            WHERE game_id = %s
              AND type = 'file'
              AND storage_key LIKE 'game/enozheng123-gmail-com/resources/%%'
        """, (game_id,))
        
        files = cur.fetchall()
        print(f"找到 {len(files)} 个文件", file=sys.stderr)
        
        # 2. 提取所有唯一的文件夹路径
        all_folders = set()
        file_to_folder = {}  # file_id -> folder_path
        
        for file_id, storage_key in files:
            # 提取路径: game/enozheng123-gmail-com/resources/{path}
            if '/resources/' in storage_key:
                path = storage_key.split('/resources/', 1)[1]
                # 去掉文件名，得到文件夹路径
                if '/' in path:
                    folder_path = '/'.join(path.split('/')[:-1])
                    file_to_folder[file_id] = folder_path
                    
                    # 添加所有层级的文件夹
                    parts = folder_path.split('/')
                    for i in range(1, len(parts) + 1):
                        all_folders.add('/'.join(parts[:i]))
        
        print(f"需要创建 {len(all_folders)} 个文件夹", file=sys.stderr)
        
        # 3. 按层级排序文件夹（从浅到深）
        sorted_folders = sorted(all_folders, key=lambda x: x.count('/'))
        
        # 4. 创建文件夹并记录ID
        folder_ids = {}  # folder_path -> folder_id
        
        for folder_path in sorted_folders:
            parts = folder_path.split('/')
            folder_name = parts[-1]
            parent_path = '/'.join(parts[:-1]) if len(parts) > 1 else None
            parent_id = folder_ids.get(parent_path) if parent_path else None
            
            # 检查文件夹是否已存在
            cur.execute("""
                SELECT id FROM files
                WHERE game_id = %s
                  AND name = %s
                  AND type = 'folder'
                  AND (parent_id = %s OR (parent_id IS NULL AND %s IS NULL))
                LIMIT 1
            """, (game_id, folder_name, parent_id, parent_id))
            
            result = cur.fetchone()
            if result:
                folder_ids[folder_path] = result[0]
            else:
                # 创建新文件夹
                cur.execute("""
                    INSERT INTO files (id, game_id, name, type, parent_id, created_at, updated_at)
                    VALUES (gen_random_uuid(), %s, %s, 'folder', %s, NOW(), NOW())
                    RETURNING id
                """, (game_id, folder_name, parent_id))
                
                folder_id = cur.fetchone()[0]
                folder_ids[folder_path] = folder_id
                print(f"创建文件夹: {folder_path}", file=sys.stderr)
        
        conn.commit()
        print(f"成功创建/验证 {len(folder_ids)} 个文件夹", file=sys.stderr)
        
        # 5. 更新所有文件的 parent_id
        print("正在更新文件的 parent_id...", file=sys.stderr)
        updated_count = 0
        
        for file_id, folder_path in file_to_folder.items():
            if folder_path in folder_ids:
                cur.execute("""
                    UPDATE files
                    SET parent_id = %s
                    WHERE id = %s
                """, (folder_ids[folder_path], file_id))
                updated_count += 1
        
        conn.commit()
        print(f"成功更新 {updated_count} 个文件的 parent_id", file=sys.stderr)
        
        # 6. 验证结果
        cur.execute("""
            SELECT 
              CASE WHEN parent_id IS NULL THEN 'NO_PARENT' ELSE 'HAS_PARENT' END as status,
              COUNT(*) as count
            FROM files
            WHERE game_id = %s AND type = 'file'
            GROUP BY status
        """, (game_id,))
        
        print("\n验证结果:", file=sys.stderr)
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]}", file=sys.stderr)
        
        print("\n完成!", file=sys.stderr)
        
    except Exception as e:
        conn.rollback()
        print(f"错误: {e}", file=sys.stderr)
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()
