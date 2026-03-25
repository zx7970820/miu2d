-- Fix black screen issue by ensuring fade transparency is 0 after load
-- The issue: FadeOut(1000) is executed but no FadeIn follows, leaving screen black

-- Option 1: Update the save data to set fadeTransparency to 0 (already done in previous fix)
-- Option 2: Update the game config to add FadeIn after LoadGame(0)

-- Let's update the newGameScript to include FadeIn
UPDATE game_configs
SET data = jsonb_set(
  data,
  '{newGameScript}',
  '"LoadGame(0)\nFadeIn()"'::jsonb
)
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';

-- Verify the update
SELECT data->'newGameScript' as new_game_script 
FROM game_configs 
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008';
