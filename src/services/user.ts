import { User } from '../types/user';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

export const findUserByOpenid = async (d1: D1Database, openid: string) => {
  const db = drizzle(d1, { schema });
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.openid, openid));
  return user;
};

export const createUser = async (
  d1: D1Database,
  userData: Omit<User, 'id' | 'created_at' | 'updated_at'>
) => {
  const db = drizzle(d1, { schema });
  const newUser = await db
    .insert(schema.users)
    .values({
      openid: userData.openid,
      nickname: userData.nickname || null,
      avatarUrl: userData.avatar_url || null,
    })
    .returning();
  return newUser;
};

export const findUserById = async (id: string, d1: D1Database) => {
  const db = drizzle(d1, { schema });
  const numericId = parseInt(id, 10);
  const user = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, numericId));
  return user;
};

export const updateUser = async (
  id: string,
  userData: Partial<User>,
  d1: D1Database
) => {
  const db = drizzle(d1, { schema });
  const numericId = parseInt(id, 10);

  // 使用 schema.users.$inferInsert 来获取与数据库表结构完全匹配的类型
  const updateData: Partial<typeof schema.users.$inferInsert> = {};
  if (userData.nickname !== undefined) {
    updateData.nickname = userData.nickname;
  }
  if (userData.avatar_url !== undefined) {
    updateData.avatarUrl = userData.avatar_url;
  }

  const updatedUser = await db
    .update(schema.users)
    .set(updateData)
    .where(eq(schema.users.id, numericId))
    .returning();
  return updatedUser;
};
