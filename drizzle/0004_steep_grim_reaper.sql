CREATE TABLE `admin_credentials` (
	`id` integer PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`revision` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_login_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`revision` text NOT NULL,
	`expires_at` integer NOT NULL
);
