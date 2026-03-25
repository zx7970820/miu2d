#!/usr/bin/env python3
"""
修复所有文件的父文件夹关系
基于 storage_key 重建完整的文件夹层级
"""

import sys

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 fix-all-file-parents.py <game_id>")
        sys.exit(1)
    
    game_id = sys.argv[1]
    
    print("-- 修复所有文件的父文件夹关系")
    print("BEGIN;")
    print()
    
    # 获取所有需要修复的文件路径模式
    # 从 storage_key 中提取路径: game/enozheng123-gmail-com/resources/{path}
    
    print("""
-- 创建临时函数来提取路径
CREATE OR REPLACE FUNCTION get_folder_path(storage_key TEXT) 
RETURNS TEXT AS $$
BEGIN
  -- 提取 resources/ 后面的路径，去掉文件名
  RETURN regexp_replace(
    substring(storage_key from 'resources/(.+)'),
    '/[^/]+$',
    ''
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 创建临时函数来获取文件夹ID（通过完整路径）
CREATE OR REPLACE FUNCTION get_folder_id_by_path(p_game_id UUID, p_path TEXT)
RETURNS UUID AS $$
DECLARE
  v_parts TEXT[];
  v_current_id UUID;
  v_parent_id UUID;
  v_part TEXT;
BEGIN
  -- 分割路径
  v_parts := string_to_array(p_path, '/');
  v_parent_id := NULL;
  
  -- 逐层查找文件夹
  FOREACH v_part IN ARRAY v_parts
  LOOP
    SELECT id INTO v_current_id
    FROM files
    WHERE game_id = p_game_id
      AND name = v_part
      AND type = 'folder'
      AND (parent_id = v_parent_id OR (parent_id IS NULL AND v_parent_id IS NULL))
    LIMIT 1;
    
    IF v_current_id IS NULL THEN
      RETURN NULL;
    END IF;
    
    v_parent_id := v_current_id;
  END LOOP;
  
  RETURN v_current_id;
END;
$$ LANGUAGE plpgsql STABLE;
""")
    
    print(f"""
-- 更新所有文件的 parent_id
UPDATE files f
SET parent_id = get_folder_id_by_path('{game_id}', get_folder_path(f.storage_key))
WHERE f.game_id = '{game_id}'
  AND f.type = 'file'
  AND f.storage_key IS NOT NULL
  AND f.storage_key LIKE 'game/enozheng123-gmail-com/resources/%';
""")
    
    print("""
-- 清理临时函数
DROP FUNCTION IF EXISTS get_folder_path(TEXT);
DROP FUNCTION IF EXISTS get_folder_id_by_path(UUID, TEXT);
""")
    
    print("COMMIT;")
    print()
    
    # 验证结果
    print(f"""
-- 验证修复结果
SELECT 
  CASE 
    WHEN parent_id IS NULL THEN 'NO_PARENT'
    ELSE 'HAS_PARENT'
  END as status,
  COUNT(*) as count
FROM files
WHERE game_id = '{game_id}'
  AND type = 'file'
GROUP BY status;

-- 检查一些关键文件
SELECT name, storage_key, 
  (SELECT name FROM files p WHERE p.id = f.parent_id) as parent_name
FROM files f
WHERE game_id = '{game_id}'
  AND type = 'file'
  AND name IN ('mouse.msf', 'panel.msf')
ORDER BY name;
""")

if __name__ == '__main__':
    main()
