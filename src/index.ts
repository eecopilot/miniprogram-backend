import { Hono } from 'hono';
import { Bindings } from './types/global';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema';
const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
  // const token = c.env.token;
  const db = drizzle(c.env.DB);
  const users = await db.select().from(schema.users).all();
  return c.json(users);
});

export default app;
