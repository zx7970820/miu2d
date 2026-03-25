-- Check what's under asf/ui
SELECT f.id, f.name, f.type
FROM files f
WHERE f.game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND f.parent_id = 'f8643a64-ef22-4c53-b65e-102b2f2d15c1'  -- asf/ui folder id
ORDER BY f.type, f.name
LIMIT 20;

-- Check files that should be under asf/ui/common
SELECT storage_key
FROM files
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND storage_key LIKE '%asf/ui/common/%'
  AND type = 'file'
LIMIT 10;
