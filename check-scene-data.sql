-- Check scene manifest data
SELECT 
  key,
  name,
  jsonb_array_length(data->'tiles') as tile_count,
  data->'tiles'->0 as first_tile
FROM scenes
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND key = 'map_002_凌绝峰峰顶'
LIMIT 1;
