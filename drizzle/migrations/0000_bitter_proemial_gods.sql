CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT '"2025-03-15T05:13:53.359Z"' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openid` text NOT NULL,
	`nickname` text,
	`avatar_url` text,
	`created_at` integer DEFAULT '"2025-03-15T05:13:53.359Z"' NOT NULL,
	`updated_at` integer DEFAULT '"2025-03-15T05:13:53.359Z"' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openid_unique` ON `users` (`openid`);