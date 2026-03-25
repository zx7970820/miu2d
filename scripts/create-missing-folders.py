#!/usr/bin/env python3
"""
从文件的 storage_key 中提取所有文件夹路径并创建缺失的文件夹
"""

import sys

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 create-missing-folders.py <game_id>")
        sys.exit(1)
    
    game_id = sys.argv[1]
    
    print("-- 从 storage_key 创建所有缺失的文件夹")
    print("BEGIN;")
    print()
    
    print(f"""
-- 提取所有唯一的文件夹路径
WITH RECURSIVE 
-- 1. 从所有文件的 storage_key 中提取路径
file_paths AS (
  SELECT DISTINCT
    regexp_replace(
      substring(storage_key from 'resources/(.+)'),
      '/[^/]+$',
      ''
    ) as full_path
  FROM files
  WHERE game_id = '{game_id}'
    AND type = 'file'
    AND storage_key LIKE 'game/enozheng123-gmail-com/resources/%'
),
-- 2. 分解路径为所有层级的文件夹
all_folders AS (
  SELECT 
    full_path,
    string_to_array(full_path, '/') as parts,
    array_length(string_to_array(full_path, '/'), 1) as depth
  FROM file_paths
),
-- 3. 生成所有层级的文件夹路径
folder_hierarchy AS (
  SELECT DISTINCT
    array_to_string(parts[1:i], '/') as folder_path,
    i as depth
  FROM all_folders, generate_series(1, depth) as i
)
-- 4. 插入缺失的文件夹（按层级从浅到深）
INSERT INTO files (id, game_id, name, type, parent_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  '{game_id}',
  -- 文件夹名称（路径的最后一部分）
  CASE 
    WHEN folder_path LIKE '%/%' THEN substring(folder_path from '[^/]+$')
    ELSE folder_path
  END,
  'folder',
  -- 父文件夹ID
  CASE 
    WHEN folder_path LIKE '%/%' THEN (
      SELECT f.id 
      FROM files f
      WHERE f.game_id = '{game_id}'
        AND f.type = 'folder'
        AND f.name = substring(
          regexp_replace(folder_path, '/[^/]+$', ''),
          '[^/]+$'
        )
        AND (
          -- 如果父文件夹还有父级
          CASE 
            WHEN regexp_replace(folder_path, '/[^/]+$', '') LIKE '%/%' THEN
              f.parent_id = (
                SELECT ff.id
                FROM files ff
                WHERE ff.game_id = '{game_id}'
                  AND ff.type = 'folder'
                  AND ff.name = substring(
                    regexp_replace(
                      regexp_replace(folder_path, '/[^/]+$', ''),
                      '/[^/]+$',
                      ''
                    ),
                    '[^/]+$'
                  )
                LIMIT 1
              )
            ELSE
              f.parent_id IS NULL
          END
        )
      LIMIT 1
    )
    ELSE NULL
  END,
  NOW(),
  NOW()
FROM folder_hierarchy
WHERE NOT EXISTS (
  SELECT 1 
  FROM files existing
  WHERE existing.game_id = '{game_id}'
    AND existing.type = 'folder'
    AND existing.name = CASE 
      WHEN folder_path LIKE '%/%' THEN substring(folder_path from '[^/]+$')
      ELSE folder_path
    END
    -- 这里需要更精确的父级匹配，但为了简化先不做
)
ORDER BY depth;
""")
    
    print("COMMIT;")
    print()
    
    print(f"""
-- 验证创建的文件夹数量
SELECT COUNT(*) as folder_count
FROM files
WHERE game_id = '{game_id}'
  AND type = 'folder';
""")

if __name__ == '__main__':
    main()
