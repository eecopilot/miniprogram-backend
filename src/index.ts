import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings } from './types/global';

import userRouter from './routes/user';
import mockRouter from './routes/mock';
import devRouter from './routes/dev';

const app = new Hono<{ Bindings: Bindings }>();

// 添加 CORS 中间件
app.use(
  '/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })
);

// 注册模拟路由和开发路由（不需要验证）
app.route('/api', mockRouter);
app.route('/api', devRouter);

// 添加内部 token 验证中间件（仅应用于特定路径）
// app.use('/api/user/*', async (c, next) => {
//   const token = c.req.header('x-custom-token');
//   if (token !== c.env.internalToken) {
//     return c.text('Unauthorized', 401);
//   }
//   await next();
// });

// 根路由
app.get('/', async (c) => {
  // const token = c.env.token;
  // console.log('c.env', c.env);
  // const db = drizzle(c.env.DB);
  // const users = await db.select().from(schema.users).all();
  // return c.json(users);
  return c.json({ message: 'Hello, World!' });
});

// 注册用户路由
app.route('/api/user', userRouter);

export default app;
