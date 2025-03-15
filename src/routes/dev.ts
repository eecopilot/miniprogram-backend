import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { Bindings } from '../types/global';
import { User, LoginResponse } from '../types/user';
import { findUserByOpenid, createUser } from '../services/user';
import { createSession } from '../services/session';

const devRouter = new Hono<{ Bindings: Bindings }>();

// 本地开发环境登录接口
devRouter.post('/dev/login', async (c) => {
  try {
    // 从请求体中获取测试用的code
    const { code } = await c.req.json();

    if (!code) {
      return c.json({ error: 'Code is required' }, 400);
    }

    // 调用模拟的微信接口
    const mockWxUrl = `${
      c.req.url.split('/dev')[0]
    }/mock/wx/jscode2session?appid=mock_appid&secret=mock_secret&js_code=${code}&grant_type=authorization_code`;

    const response = await fetch(mockWxUrl);
    const data = (await response.json()) as {
      openid: string;
      session_key: string;
      unionid?: string;
      errcode?: number;
      errmsg?: string;
    };

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
        nickname: `测试用户_${code}`,
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
    console.error('Dev login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default devRouter;
