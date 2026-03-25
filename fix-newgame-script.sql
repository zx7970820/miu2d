-- Update newGameScript to directly load map and player
-- Instead of LoadGame(0), we use LoadMap and LoadPlayer
UPDATE game_configs
SET data = jsonb_set(
  data,
  '{newGameScript}',
  '"LoadMap(\"map_002_凌绝峰峰顶.mmf\")\nLoadPlayer(\"player0.ini\")"'::jsonb
)
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';

-- Verify
SELECT data->>'newGameScript' as new_game_script
FROM game_configs
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';
