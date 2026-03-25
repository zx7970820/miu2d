-- Check file counts
SELECT type, COUNT(*) FROM files WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008' GROUP BY type;

-- Check for mouse.msf
SELECT id, name, type, storage_key FROM files WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008' AND name = 'mouse.msf';

-- Check asf/ui/common folder structure
SELECT f.id, f.name, f.type, p.name as parent_name
FROM files f
LEFT JOIN files p ON f.parent_id = p.id
WHERE f.game_id = '96670aaf-94d9-40d3-a320-e57285843008'
AND f.name IN ('asf', 'ui', 'common')
ORDER BY f.name;
