-- Update newGameScript to only load map
-- Player should be loaded automatically from playerKey config
UPDATE game_configs
SET data = jsonb_set(
  data,
  '{newGameScript}',
  '"LoadMap(\"map_002_凌绝峰峰顶.mmf\")"'::jsonb
)
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';

-- Verify
SELECT 
  data->>'newGameScript' as new_game_script,
  data->>'playerKey' as player_key,
  data->>'initialMap' as initial_map
FROM game_configs
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';
