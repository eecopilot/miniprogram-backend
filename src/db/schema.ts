import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// 用户表
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  openid: text('openid').notNull().unique(),
  nickname: text('nickname'),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(new Date()),
});

// 登录状态表
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(new Date()),
});
