-- Check all saves for this game
SELECT COUNT(*) as save_count
FROM saves
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';

-- List saves
SELECT id, name, map_name, level, player_name
FROM saves
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
LIMIT 5;
