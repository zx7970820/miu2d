-- Check scenes table
\x
SELECT COUNT(*) as scene_count
FROM scenes
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';

-- Check if the initial map scene exists
SELECT id, key, name
FROM scenes
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND key = 'map_002_凌绝峰峰顶'
LIMIT 1;

-- List all scenes
SELECT key, name
FROM scenes
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
ORDER BY key
LIMIT 10;
