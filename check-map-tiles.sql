-- Check if these tile files exist
SELECT name, storage_key, parent_id,
  (SELECT name FROM files p WHERE p.id = f.parent_id) as parent_name
FROM files f
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND name IN ('石头05.msf', '树01.msf', '树02.msf')
  AND type = 'file'
ORDER BY name;

-- Check the map folder structure
SELECT f.id, f.name, f.type, 
  (SELECT name FROM files p WHERE p.id = f.parent_id) as parent_name
FROM files f
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND (f.name LIKE '%map_002%' OR f.name = 'map')
  AND f.type = 'folder'
ORDER BY f.name;

-- Check files under mpc/map folder
SELECT name, storage_key
FROM files
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND storage_key LIKE '%mpc/map/map_002%'
  AND type = 'file'
ORDER BY name
LIMIT 10;
