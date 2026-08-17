CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`at` text NOT NULL,
	`actor_id` text,
	`geo_scope_id` text,
	`practice` text,
	`signal_type` text,
	`target_id` text
);
--> statement-breakpoint
CREATE INDEX `analytics_events_scope_idx` ON `analytics_events` (`geo_scope_id`,`at`);--> statement-breakpoint
CREATE TABLE `appreciations` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `appreciations_unique_idx` ON `appreciations` (`post_id`,`actor_id`);--> statement-breakpoint
CREATE TABLE `attestations` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`kind` text NOT NULL,
	`geo_scope_id` text,
	`result` text NOT NULL,
	`method` text NOT NULL,
	`provider_ref` text,
	`age_threshold` integer,
	`country` text,
	`issued_at` text NOT NULL,
	`expires_at` text,
	FOREIGN KEY (`subject_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attestations_subject_idx` ON `attestations` (`subject_id`,`kind`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`at` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_events_subject_idx` ON `audit_events` (`subject_type`,`subject_id`);--> statement-breakpoint
CREATE TABLE `blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`blocker_id` text NOT NULL,
	`blocked_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`blocker_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`blocked_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blocks_unique_idx` ON `blocks` (`blocker_id`,`blocked_id`);--> statement-breakpoint
CREATE INDEX `blocks_blocked_idx` ON `blocks` (`blocked_id`);--> statement-breakpoint
CREATE TABLE `community_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`inviter_id` text NOT NULL,
	`geo_scope_id` text NOT NULL,
	`state` text DEFAULT 'issued' NOT NULL,
	`accepted_by_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inviter_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`geo_scope_id`) REFERENCES `geo_scopes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_invites_code_idx` ON `community_invites` (`code`);--> statement-breakpoint
CREATE TABLE `geo_attachments` (
	`user_id` text NOT NULL,
	`geo_scope_id` text NOT NULL,
	`kind` text NOT NULL,
	`evidence` text NOT NULL,
	`since` text NOT NULL,
	PRIMARY KEY(`user_id`, `geo_scope_id`),
	FOREIGN KEY (`user_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`geo_scope_id`) REFERENCES `geo_scopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `geo_attachments_scope_idx` ON `geo_attachments` (`geo_scope_id`);--> statement-breakpoint
CREATE TABLE `geo_scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`country_code` text NOT NULL,
	`timezone` text,
	`centroid_lat` integer,
	`centroid_lng` integer,
	`provenance_source` text NOT NULL,
	`provenance_source_id` text,
	`provenance_verified` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `geo_scopes_parent_idx` ON `geo_scopes` (`parent_id`);--> statement-breakpoint
CREATE INDEX `geo_scopes_name_idx` ON `geo_scopes` (`name`);--> statement-breakpoint
CREATE TABLE `host_exclusions` (
	`signal_id` text NOT NULL,
	`user_id` text NOT NULL,
	`by_host_id` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`at` text NOT NULL,
	PRIMARY KEY(`signal_id`, `user_id`),
	FOREIGN KEY (`signal_id`) REFERENCES `signals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`by_host_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `messages_thread_idx` ON `messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `moderation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`kind` text NOT NULL,
	`actor_id` text NOT NULL,
	`rationale` text DEFAULT '' NOT NULL,
	`expires_at` text,
	`at` text NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `moderation_cases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `moderation_actions_case_idx` ON `moderation_actions` (`case_id`);--> statement-breakpoint
CREATE TABLE `moderation_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`state` text DEFAULT 'open' NOT NULL,
	`triage_labels` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `moderation_cases_target_idx` ON `moderation_cases` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `organization_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_name` text NOT NULL,
	`geo_scope_id` text NOT NULL,
	`role` text NOT NULL,
	`verified` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`geo_scope_id`) REFERENCES `geo_scopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`signal_id` text NOT NULL,
	`user_id` text NOT NULL,
	`state` text DEFAULT 'joined' NOT NULL,
	`joined_at` text NOT NULL,
	PRIMARY KEY(`signal_id`, `user_id`),
	FOREIGN KEY (`signal_id`) REFERENCES `signals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`display_name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`avatar_seed` text NOT NULL,
	`avatar_motif` text NOT NULL,
	`age_band` text NOT NULL,
	`account_state` text DEFAULT 'active' NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `people_handle_idx` ON `people` (`handle`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`geo_scope_id` text NOT NULL,
	`caption` text NOT NULL,
	`practice` text,
	`media_id` text NOT NULL,
	`media_alt` text NOT NULL,
	`media_seed` text NOT NULL,
	`media_motif` text NOT NULL,
	`media_metadata_stripped` integer DEFAULT true NOT NULL,
	`audience` text DEFAULT 'all' NOT NULL,
	`state` text DEFAULT 'published' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`geo_scope_id`) REFERENCES `geo_scopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `posts_scope_created_idx` ON `posts` (`geo_scope_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`author_id`);--> statement-breakpoint
CREATE TABLE `profile_tags` (
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`user_id`, `kind`, `value`),
	FOREIGN KEY (`user_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `profile_tags_value_idx` ON `profile_tags` (`value`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`case_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reports_case_idx` ON `reports` (`case_id`);--> statement-breakpoint
CREATE TABLE `signal_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`signal_id` text NOT NULL,
	`responder_id` text NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`signal_id`) REFERENCES `signals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responder_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `signal_responses_signal_idx` ON `signal_responses` (`signal_id`);--> statement-breakpoint
CREATE TABLE `signals` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`geo_scope_id` text NOT NULL,
	`practice` text,
	`linked_post_id` text,
	`place_label` text,
	`starts_at` text,
	`expires_at` text,
	`capacity` integer,
	`audience` text DEFAULT 'all' NOT NULL,
	`state` text DEFAULT 'open' NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`geo_scope_id`) REFERENCES `geo_scopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `signals_scope_state_idx` ON `signals` (`geo_scope_id`,`state`);--> statement-breakpoint
CREATE INDEX `signals_creator_idx` ON `signals` (`creator_id`);--> statement-breakpoint
CREATE TABLE `thread_participants` (
	`thread_id` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`thread_id`, `user_id`),
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`signal_id` text NOT NULL,
	`response_id` text NOT NULL,
	`state` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`signal_id`) REFERENCES `signals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`response_id`) REFERENCES `signal_responses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `threads_signal_idx` ON `threads` (`signal_id`);--> statement-breakpoint
CREATE TABLE `vouch_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`voucher_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`geo_scope_id` text NOT NULL,
	`statement` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`voucher_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`geo_scope_id`) REFERENCES `geo_scopes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vouch_unique_idx` ON `vouch_evidence` (`voucher_id`,`subject_id`,`geo_scope_id`);