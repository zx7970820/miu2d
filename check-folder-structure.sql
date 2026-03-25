-- Check all 'common' folders
SELECT id, name, type, parent_id, 
  (SELECT name FROM files p WHERE p.id = f.parent_id) as parent_name
FROM files f
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND name = 'common'
  AND type = 'folder';

-- Check all 'ui' folders
SELECT id, name, type, parent_id,
  (SELECT name FROM files p WHERE p.id = f.parent_id) as parent_name
FROM files f
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND name = 'ui'
  AND type = 'folder';

-- Check the correct path: asf -> ui -> common
SELECT 
  asf.id as asf_id, asf.name as asf_name,
  ui.id as ui_id, ui.name as ui_name,
  common.id as common_id, common.name as common_name
FROM files asf
LEFT JOIN files ui ON ui.parent_id = asf.id AND ui.name = 'ui' AND ui.type = 'folder'
LEFT JOIN files common ON common.parent_id = ui.id AND common.name = 'common' AND common.type = 'folder'
WHERE asf.game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND asf.name = 'asf'
  AND asf.type = 'folder'
  AND asf.parent_id IS NULL;
