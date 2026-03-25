-- Check if save 0 (initial save) exists
\x
SELECT id, index, name
FROM saves
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND index = 0;

-- If not exists, list all saves
SELECT index, name, data->>'mapPath' as map_path
FROM saves
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
ORDER BY index;
