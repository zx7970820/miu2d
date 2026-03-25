-- Check files without parents
SELECT name, storage_key
FROM files
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND type = 'file'
  AND parent_id IS NULL;
