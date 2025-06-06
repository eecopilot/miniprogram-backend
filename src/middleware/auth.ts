import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { Bindings } from '../types/global';
import { findUserByOpenid } from '../services/user';
import { findSessionByToken, extendSession } from '../services/session';

export interface AuthContext {
  userId: number;
  openid: string;
}

// 身份验证中间件
export const authMiddleware = async (
  c: Context<{ Bindings: Bindings; Variables: { auth: AuthContext } }>,
  next: Next
) => {
  try {
    // 从请求头中获取 token
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 验证 token
    const payload = await verify(token, c.env.JWT_SECRET);
    const openid = payload.openid as string;

    // 根据 openid 查询用户
    const dbUser = await findUserByOpenid(c.env.DB, openid);
    if (!dbUser || dbUser.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // 检查会话是否存在且未过期
    const session = await findSessionByToken(token, c.env.DB);
    if (!session) {
      return c.json({ error: 'Session not found' }, 401);
    }

    // 检查会话是否已过期
    const now = new Date();
    if (new Date(session.expiresAt) < now) {
      return c.json({ error: 'Session expired' }, 401);
    }

    // 会话续期 - 延长7天
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    await extendSession(token, newExpiresAt, c.env.DB);

    // 将用户信息存储在上下文中，以便后续处理
    c.set('auth', {
      userId: dbUser[0].id,
      openid: dbUser[0].openid,
    });

    // 继续处理请求
    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Unauthorized' }, 401);
  }
};
