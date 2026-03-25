#!/usr/bin/env python3
"""
修复文件夹层级关系
通过 storage_key 重建正确的父子关系
"""

import sys

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 fix-folder-hierarchy.py <game_id>")
        sys.exit(1)
    
    game_id = sys.argv[1]
    
    print("-- 修复文件夹层级关系")
    print("BEGIN;")
    print()
    
    # 1. 创建 asf/ui/common 文件夹（如果不存在）
    print("-- 创建 asf/ui/common 文件夹")
    print(f"""
INSERT INTO files (id, game_id, name, type, parent_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  '{game_id}',
  'common',
  'folder',
  (SELECT id FROM files WHERE game_id = '{game_id}' AND name = 'ui' AND type = 'folder' 
   AND parent_id = (SELECT id FROM files WHERE game_id = '{game_id}' AND name = 'asf' AND type = 'folder' AND parent_id IS NULL)),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM files WHERE game_id = '{game_id}' AND name = 'common' AND type = 'folder'
  AND parent_id = (SELECT id FROM files WHERE game_id = '{game_id}' AND name = 'ui' AND type = 'folder' 
                   AND parent_id = (SELECT id FROM files WHERE game_id = '{game_id}' AND name = 'asf' AND type = 'folder' AND parent_id IS NULL))
);
""")
    
    # 2. 更新所有 asf/ui/common/* 文件的 parent_id
    print("-- 更新 asf/ui/common/* 文件的 parent_id")
    print(f"""
UPDATE files
SET parent_id = (
  SELECT id FROM files 
  WHERE game_id = '{game_id}' 
    AND name = 'common' 
    AND type = 'folder'
    AND parent_id = (
      SELECT id FROM files 
      WHERE game_id = '{game_id}' 
        AND name = 'ui' 
        AND type = 'folder'
        AND parent_id = (
          SELECT id FROM files 
          WHERE game_id = '{game_id}' 
            AND name = 'asf' 
            AND type = 'folder' 
            AND parent_id IS NULL
        )
    )
)
WHERE game_id = '{game_id}'
  AND storage_key LIKE 'game/enozheng123-gmail-com/resources/asf/ui/common/%'
  AND type = 'file';
""")
    
    # 3. 创建其他可能缺失的文件夹并更新文件
    folders_to_fix = [
        ('asf/ui/message', ['asf', 'ui', 'message']),
        ('asf/ui/login', ['asf', 'ui', 'login']),
        ('asf/ui/system', ['asf', 'ui', 'system']),
    ]
    
    for folder_path, parts in folders_to_fix:
        print(f"-- 创建 {folder_path} 文件夹")
        
        # 构建父文件夹查询
        if len(parts) == 3:
            parent_query = f"""(SELECT id FROM files WHERE game_id = '{game_id}' AND name = '{parts[1]}' AND type = 'folder' 
                             AND parent_id = (SELECT id FROM files WHERE game_id = '{game_id}' AND name = '{parts[0]}' AND type = 'folder' AND parent_id IS NULL))"""
        else:
            parent_query = "NULL"
        
        print(f"""
INSERT INTO files (id, game_id, name, type, parent_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  '{game_id}',
  '{parts[-1]}',
  'folder',
  {parent_query},
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM files WHERE game_id = '{game_id}' AND name = '{parts[-1]}' AND type = 'folder'
  AND parent_id = {parent_query}
);
""")
        
        print(f"-- 更新 {folder_path}/* 文件的 parent_id")
        print(f"""
UPDATE files
SET parent_id = (
  SELECT id FROM files 
  WHERE game_id = '{game_id}' 
    AND name = '{parts[-1]}' 
    AND type = 'folder'
    AND parent_id = {parent_query}
)
WHERE game_id = '{game_id}'
  AND storage_key LIKE 'game/enozheng123-gmail-com/resources/{folder_path}/%'
  AND type = 'file';
""")
    
    print("COMMIT;")
    print()
    print("-- 验证修复结果")
    print(f"""
SELECT 
  'asf/ui/common' as path,
  COUNT(*) as file_count
FROM files
WHERE game_id = '{game_id}'
  AND storage_key LIKE 'game/enozheng123-gmail-com/resources/asf/ui/common/%'
  AND type = 'file'
  AND parent_id = (
    SELECT id FROM files 
    WHERE game_id = '{game_id}' 
      AND name = 'common' 
      AND type = 'folder'
      AND parent_id = (
        SELECT id FROM files 
        WHERE game_id = '{game_id}' 
          AND name = 'ui' 
          AND type = 'folder'
          AND parent_id = (
            SELECT id FROM files 
            WHERE game_id = '{game_id}' 
              AND name = 'asf' 
              AND type = 'folder' 
              AND parent_id IS NULL
          )
      )
  );
""")

if __name__ == '__main__':
    main()
