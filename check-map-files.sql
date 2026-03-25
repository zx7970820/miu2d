-- Check if map file exists in database
SELECT f.id, f.name, f.storage_key, f.parent_id,
  (SELECT name FROM files p WHERE p.id = f.parent_id) as parent_name
FROM files f
WHERE f.game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND f.name = 'map_002_凌绝峰峰顶.mmf'
  AND f.type = 'file';

-- Check map folder structure
SELECT f.id, f.name, f.type, f.parent_id
FROM files f
WHERE f.game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND f.name = 'map'
  AND f.type = 'folder';

-- Check all map files
SELECT name, storage_key
FROM files
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND storage_key LIKE '%/map/%'
  AND type = 'file'
ORDER BY name
LIMIT 10;
