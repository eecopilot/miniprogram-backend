import { Hono } from 'hono';
import { Bindings } from './types/global';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './db/schema';
import userRouter from './routes/user';
import mockRouter from './routes/mock';
import devRouter from './routes/dev';

const app = new Hono<{ Bindings: Bindings }>();

// 根路由
app.get('/', async (c) => {
  // const token = c.env.token;
  const db = drizzle(c.env.DB);
  const users = await db.select().from(schema.users).all();
  return c.json(users);
});

// 注册用户路由
app.route('/api/user', userRouter);

// 始终注册模拟路由和开发路由，但在生产环境中添加检查
app.route('/api', mockRouter);
app.route('/api', devRouter);

// 添加环境检查中间件，在生产环境中拦截开发路由
app.use('/api/mock/*', async (c, next) => {
  if (c.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not available in production' }, 404);
  }
  await next();
});

app.use('/api/dev/*', async (c, next) => {
  if (c.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not available in production' }, 404);
  }
  await next();
});

export default app;
