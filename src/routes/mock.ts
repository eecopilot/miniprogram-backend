import { Hono } from 'hono';
import { Bindings } from '../types/global';

const mockRouter = new Hono<{ Bindings: Bindings }>();

// 模拟微信登录接口
mockRouter.get('/mock/wx/jscode2session', (c) => {
  const code = c.req.query('js_code');
  const appid = c.req.query('appid');

  // 检查参数
  if (!code || !appid) {
    return c.json(
      {
        errcode: 40029,
        errmsg: 'invalid code or appid',
      },
      400
    );
  }

  // 根据code生成模拟的openid
  const openid = `mock_openid_${code}`;
  const session_key = `mock_session_key_${Date.now()}`;

  // 模拟微信返回
  return c.json({
    openid,
    session_key,
    unionid: `mock_unionid_${code}`,
  });
});

export default mockRouter;
