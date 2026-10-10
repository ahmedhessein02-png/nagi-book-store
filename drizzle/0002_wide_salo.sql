ALTER TABLE `orders` ADD `delivery_region` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivery_fee` integer DEFAULT 0 NOT NULL;