import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const orders=sqliteTable('orders',{
 id:text('id').primaryKey(), name:text('name').notNull(), mobile:text('mobile').notNull(), city:text('city').notNull(), address:text('address').notNull(),
 deliveryRegion:text('delivery_region').notNull().default(''), deliveryFee:integer('delivery_fee').notNull().default(0),
 paymentMethod:text('payment_method').notNull().default(''),
 items:text('items').notNull(), total:integer('total').notNull(), status:text('status').notNull().default('new'), notification:text('notification').notNull().default('not_configured'),
 notificationError:text('notification_error'), notificationId:text('notification_id'), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull()
});
export const inquiries=sqliteTable('inquiries',{
 id:text('id').primaryKey(), name:text('name').notNull(), mobile:text('mobile').notNull(), message:text('message').notNull(), status:text('status').notNull().default('new'), createdAt:text('created_at').notNull()
});
export const adminCredentials=sqliteTable('admin_credentials',{
 id:integer('id').primaryKey(),username:text('username').notNull(),passwordHash:text('password_hash').notNull(),salt:text('salt').notNull(),revision:text('revision').notNull()
});
export const adminSessions=sqliteTable('admin_sessions',{
 tokenHash:text('token_hash').primaryKey(),revision:text('revision').notNull(),expiresAt:integer('expires_at').notNull()
});
export const adminLoginLimits=sqliteTable('admin_login_limits',{
 id:text('id').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull()
});
export const managedBooks=sqliteTable('managed_books',{
 id:text('id').primaryKey(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()
});
