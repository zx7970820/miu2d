-- Verify the full path hierarchy for mouse.msf
WITH RECURSIVE file_path AS (
  -- Start with mouse.msf
  SELECT id, name, parent_id, type, storage_key, 1 as level
  FROM files
  WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
    AND name = 'mouse.msf'
    AND type = 'file'
  
  UNION ALL
  
  -- Recursively get parent folders
  SELECT f.id, f.name, f.parent_id, f.type, f.storage_key, fp.level + 1
  FROM files f
  JOIN file_path fp ON f.id = fp.parent_id
  WHERE f.game_id = '96670aaf-94d9-40d3-a320-e57285843008'
)
SELECT level, name, type, 
  CASE WHEN parent_id IS NULL THEN 'ROOT' ELSE 'HAS_PARENT' END as parent_status
FROM file_path
ORDER BY level DESC;
