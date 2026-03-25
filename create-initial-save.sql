-- Create initial save (index 0) for new game
-- This save will be loaded by LoadGame(0) command

-- First, get the user ID (assuming you're logged in)
-- We'll use a placeholder user_id, you may need to update this

INSERT INTO saves (
  id,
  game_id,
  user_id,
  name,
  map_name,
  level,
  player_name,
  is_shared,
  data,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  '96670aaf-94d9-40d3-a320-e57285843008',
  (SELECT id FROM users LIMIT 1), -- Get first user
  '初始存档',
  'map_002_凌绝峰峰顶',
  1,
  '杨影枫',
  false,
  jsonb_build_object(
    'mapPath', 'map_002_凌绝峰峰顶.mmf',
    'player', jsonb_build_object(
      'x', 15,
      'y', 60,
      'level', 1,
      'exp', 0,
      'life', 100,
      'maxLife', 100,
      'mana', 100,
      'maxMana', 100,
      'thew', 100,
      'maxThew', 100,
      'attack', 10,
      'defend', 10,
      'state', 0,
      'playerIndex', 0
    ),
    'npcs', '[]'::jsonb,
    'objs', '[]'::jsonb
  ),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM saves 
  WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
    AND name = '初始存档'
);

-- Verify
SELECT id, name, map_name, player_name
FROM saves
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND name = '初始存档';
