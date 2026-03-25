-- Check game config for newGameScript
SELECT 
  data->>'newGameScript' as new_game_script,
  data->>'initialMap' as initial_map,
  data->>'playerKey' as player_key
FROM game_configs
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';
