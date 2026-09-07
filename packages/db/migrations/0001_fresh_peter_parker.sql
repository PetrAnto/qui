ALTER TABLE `people` ADD `avatar_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `avatar_alt` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `avatar_metadata_stripped` integer DEFAULT true NOT NULL;