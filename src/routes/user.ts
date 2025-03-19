/**
 * GET: https://api.weixin.qq.com/sns/jscode2session
 *
 * params:
 * appid: 微信小程序的appid
 * secret: 微信小程序的secret
 * js_code: 微信小程序传来的code
 * grant_type: 固定值为authorization_code
 *
 * return:
 * openid: 用户唯一标识
 * session_key: 会话密钥
 *
 *
 * 微信小程序登录接口
 * 接收小程序传来的code，向微信服务器换取openid和session_key
 */

import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { Bindings } from '../types/global';
import {
  WechatLoginParams,
  WechatLoginResponse,
  User,
  LoginResponse,
} from '../types/user';
import { findUserByOpenid, createUser, findUserById } from '../services/user';
import {
  createSession,
  deleteSession,
  extendSession,
  findSessionsByUserId,
} from '../services/session';
import { authMiddleware, AuthContext } from '../middleware/auth';

// 创建路由实例
const userRouter = new Hono<{
  Bindings: Bindings;
  Variables: { auth: AuthContext };
}>();

// 用户登录不需要验证
userRouter.post('/login', async (c) => {
  try {
    const { code } = await c.req.json<WechatLoginParams>();

    if (!code) {
      return c.json({ error: 'Code is required' }, 400);
    }

    const wxLoginUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${c.env.WECHAT_APP_ID}&secret=${c.env.WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`;

    const response = await fetch(wxLoginUrl);
    const data = await response.json<
      WechatLoginResponse & { errcode?: number; errmsg?: string }
    >();

    if (data.errcode) {
      return c.json({ error: data.errmsg }, 400);
    }

    // 1. 根据 openid 查询用户是否存在
    let dbUser = await findUserByOpenid(c.env.DB, data.openid);

    // 2. 如果用户不存在，创建新用户
    if (!dbUser || dbUser.length === 0) {
      dbUser = await createUser(c.env.DB, {
        openid: data.openid,
        unionid: data.unionid,
      });
    }

    // 将数据库结果映射到 User 类型
    const userResult = dbUser[0];
    const user: User = {
      id: String(userResult.id),
      openid: userResult.openid,
      unionid: data.unionid,
      nickname: userResult.nickname || undefined,
      avatar_url: userResult.avatarUrl || undefined,
      created_at: userResult.createdAt.toISOString(),
      updated_at: userResult.updatedAt.toISOString(),
    };

    // 3. 生成 JWT token
    const token = await sign(
      {
        openid: data.openid,
        session_key: data.session_key,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7天过期
        iat: Math.floor(Date.now() / 1000), // 签发时间
      },
      c.env.JWT_SECRET
    );
    // 检查用户是否已有会话，如果有则只更新过期时间
    const existingSessions = await findSessionsByUserId(
      userResult.id,
      c.env.DB
    );
    if (existingSessions && existingSessions.length > 0) {
      // 找到最近的会话并延长其有效期
      const latestSession = existingSessions.reduce((latest, current) => {
        return new Date(latest.expiresAt) > new Date(current.expiresAt)
          ? latest
          : current;
      });

      // 延长会话有效期
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 延长7天

      await extendSession(latestSession.token, newExpiresAt, c.env.DB);

      // 使用现有会话的token
      return c.json<LoginResponse>({
        token: latestSession.token,
        user,
      });
    }
    // 保存会话到数据库
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

    await createSession(
      {
        userId: userResult.id,
        token,
        expiresAt,
      },
      c.env.DB
    );

    // 4. 返回用户信息和 token
    return c.json<LoginResponse>({
      token,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 需要验证的路由组
userRouter.use('/profile', authMiddleware);

// 获取用户信息
userRouter.get('/profile', async (c) => {
  try {
    // 从中间件中获取用户ID
    const { userId } = c.get('auth');

    // 根据用户ID查询用户详细信息
    const dbUser = await findUserById(String(userId), c.env.DB);
    if (!dbUser || dbUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // 将数据库结果映射到 User 类型
    const userResult = dbUser[0];
    const user: User = {
      id: String(userResult.id),
      openid: userResult.openid,
      nickname: userResult.nickname || undefined,
      avatar_url: userResult.avatarUrl || undefined,
      created_at: userResult.createdAt.toISOString(),
      updated_at: userResult.updatedAt.toISOString(),
    };

    return c.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 提供一个接口，给另一个 worker 验证token
userRouter.get('/verify', async (c) => {
  const token = c.req.header('Authorization');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    const isValid = Boolean(payload.openid);
    return c.json({ isValid });
  } catch (error) {
    console.error('Token verification error:', error);
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// 提供一个接口，给另一个 worker 续期session
userRouter.post('/session-extend', async (c) => {
  const token = c.req.header('Authorization');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // 续期session
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);
  await extendSession(token, newExpiresAt, c.env.DB);

  return c.json({ success: true, message: 'Session extended successfully' });
});

// 登出接口
userRouter.post('/logout', authMiddleware, async (c) => {
  try {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 删除会话
    await deleteSession(token, c.env.DB);

    return c.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default userRouter;
