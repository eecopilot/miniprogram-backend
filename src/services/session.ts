import * as schema from '../db/schema';
import { drizzle } from 'drizzle-orm/d1';

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
