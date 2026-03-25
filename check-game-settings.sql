-- Check game basic info
SELECT id, slug, name, description 
FROM games 
WHERE slug = 'enozheng123-gmail-com';

-- Check game configs
SELECT * 
FROM game_configs 
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';

-- Check if there are any players
SELECT id, name, key
FROM players
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
LIMIT 5;
