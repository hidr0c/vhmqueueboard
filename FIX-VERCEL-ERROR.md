# Fix: Prisma Client Not Generated Error on Vercel

## Vấn đề
```
Error: @prisma/client did not initialize yet. Please run "prisma generate"
```

## Đã sửa ✅

### 1. Thêm `postinstall` script vào `package.json`
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### 2. Cập nhật `build` script
```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

### 3. Xóa `prisma.config.ts`
File này gây conflict khi build. Prisma sẽ tự động load từ `.env`

## Deploy lên Vercel

### Lần đầu tiên (với SQLite - chỉ để test)
```bash
git add .
git commit -m "Fix: Add prisma generate to build"
git push origin main
```

**LƯU Ý**: SQLite sẽ bị reset mỗi lần deploy!

### Production (với Vercel Postgres - Khuyến nghị)

1. **Deploy lên Vercel** (sẽ fail lần đầu - bình thường!)

2. **Tạo Postgres Database**:
   - Vercel Dashboard > Storage > Create Database > Postgres

3. **Cập nhật `prisma/schema.prisma`**:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

4. **Push changes**:
```bash
git add prisma/schema.prisma
git commit -m "Switch to PostgreSQL"
git push origin main
```

5. **Chạy migrations**:
```bash
# Cài Vercel CLI
npm i -g vercel

# Login và link
vercel login
vercel link

# Pull env vars
vercel env pull .env.local

# Chạy migration
npx prisma migrate deploy
```

## Xong! 🎉

Website đã live tại: `https://your-project.vercel.app`

Xem chi tiết trong file `DEPLOY.md`
