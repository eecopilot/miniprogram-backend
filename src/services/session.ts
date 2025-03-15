import * as schema from '../db/schema';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';

export interface SessionData {
  userId: number;
  token: string;
  expiresAt: Date;
}

export const createSession = async (
  sessionData: SessionData,
  d1: D1Database
) => {
  const db = drizzle(d1, { schema });
  const session = await db
    .insert(schema.sessions)
    .values({
      userId: sessionData.userId,
      token: sessionData.token,
      expiresAt: sessionData.expiresAt,
    })
    .returning();
  return session;
};

// 根据token查找会话
export const findSessionByToken = async (token: string, d1: D1Database) => {
  const db = drizzle(d1, { schema });
  const session = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.token, token));
  return session.length > 0 ? session[0] : null;
};

// 更新会话过期时间
export const extendSession = async (
  token: string,
  newExpiresAt: Date,
  d1: D1Database
) => {
  const db = drizzle(d1, { schema });
  const updatedSession = await db
    .update(schema.sessions)
    .set({
      expiresAt: newExpiresAt,
    })
    .where(eq(schema.sessions.token, token))
    .returning();
  return updatedSession;
};

// 删除会话（登出）
export const deleteSession = async (token: string, d1: D1Database) => {
  const db = drizzle(d1, { schema });
  await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
};
