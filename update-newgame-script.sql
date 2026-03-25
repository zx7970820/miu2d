-- Update game config to add newGameScript
UPDATE game_configs
SET data = jsonb_set(
  data,
  '{newGameScript}',
  '"LoadGame(0)"'::jsonb
)
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';

-- Verify the update
SELECT 
  data->>'newGameScript' as new_game_script,
  data->>'initialMap' as initial_map,
  data->>'playerKey' as player_key
FROM game_configs
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';
