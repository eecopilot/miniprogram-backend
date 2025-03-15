export interface WechatLoginParams {
  code: string;
}

export interface WechatLoginResponse {
  session_key: string;
  openid: string;
  unionid?: string;
}

export interface JWTPayload {
  openid: string;
  session_key: string;
  exp: number; // 过期时间（Unix timestamp in seconds）
  iat: number; // 签发时间（Unix timestamp in seconds）
}

export interface User {
  id: string;
  openid: string;
  unionid?: string;
  nickname?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
