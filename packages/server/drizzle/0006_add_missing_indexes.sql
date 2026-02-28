CREATE INDEX "files_game_id_parent_id_idx" ON "files" USING btree ("game_id","parent_id");--> statement-breakpoint
CREATE INDEX "game_members_game_id_user_id_idx" ON "game_members" USING btree ("game_id","user_id");--> statement-breakpoint
CREATE INDEX "saves_game_id_user_id_idx" ON "saves" USING btree ("game_id","user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions" USING btree ("user_id","expires_at");