CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`mobile` text NOT NULL,
	`city` text NOT NULL,
	`address` text NOT NULL,
	`items` text NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notification` text DEFAULT 'not_configured' NOT NULL,
	`notification_error` text,
	`notification_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
