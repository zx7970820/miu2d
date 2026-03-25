-- Check player data from database
SELECT id, name, key, data->'npcIni' as npc_ini
FROM players
WHERE game_id = '96670aaf-94d9-40d3-a320-e57285843008'
  AND key = 'player0.ini'
LIMIT 1;
