```
npm install
npm run dev
```

```
npm run deploy
```

# DB

```
bun db:generate # 产生sql
```

```
#local
bunx wrangler d1 execute miniprogram --local --file=./drizzle/migrations/0000_bitter_proemial_gods.sql

#remote
bunx wrangler d1 execute miniprogram --remote --file=./drizzle/migrations/0000_bitter_proemial_gods.sql
```
