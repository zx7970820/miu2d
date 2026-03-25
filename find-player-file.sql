-- Find player0.ini file
\x
SELECT name, storage_key, parent_id,
  (SELECT name FROM files p WHERE p.id = f.parent_id) as parent_name
FROM files
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND name = 'player0.ini'
  AND type = 'file'
LIMIT 1;

-- Check if there are any .ini files in mpc folder
SELECT name, storage_key
FROM files
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND storage_key LIKE '%mpc%'
  AND name LIKE '%.ini'
  AND type = 'file'
LIMIT 5;
