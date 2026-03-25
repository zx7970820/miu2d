-- Check game configuration
SELECT id, slug, name, settings 
FROM games 
WHERE slug = 'enozheng123-gmail-com';

-- Check available maps
SELECT name 
FROM files 
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND type = 'file'
  AND storage_key LIKE '%/map/%'
  AND name LIKE '%.mmf'
ORDER BY name
LIMIT 10;
