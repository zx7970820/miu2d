-- Update initial save to set screen not black
UPDATE saves
SET data = jsonb_set(
  data,
  '{screenFade}',
  '0'::jsonb
)
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND name = '初始存档';

-- Verify
SELECT name, data->'screenFade' as screen_fade
FROM saves
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND name = '初始存档';
