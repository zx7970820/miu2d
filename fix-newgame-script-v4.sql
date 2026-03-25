-- Update newGameScript to use LoadGame(0)
-- This will load the initial save we just created
UPDATE game_configs
SET data = jsonb_set(
  data,
  '{newGameScript}',
  '"LoadGame(0)\nFadeOut(1000)"'::jsonb
)
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';

-- Verify
SELECT data->>'newGameScript' as new_game_script
FROM game_configs
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';
