# Hướng Dẫn Deploy Lên Vercel

## ⚠️ LƯU Ý VỀ DATABASE

SQLite **KHÔNG phù hợp** để deploy lên Vercel vì:
1. Vercel sử dụng serverless functions - không có filesystem persist
2. Mỗi request có thể chạy trên server khác nhau
3. Database sẽ bị mất sau mỗi lần deploy

## ✅ GIẢI PHÁP: Sử dụng Vercel Postgres (Miễn phí)

### Bước 1: Cài đặt Vercel Postgres

```bash
npm install @vercel/postgres
```

### Bước 2: Cập nhật Prisma Schema

Thay đổi trong `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Thay vì "sqlite"
  url      = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

### Bước 3: Deploy lên Vercel

1. **Push code lên GitHub**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push
   ```

2. **Tạo project trên Vercel**
   - Truy cập: https://vercel.com
   - Click "Add New" > "Project"
   - Import repository GitHub của bạn

3. **Thêm Vercel Postgres Database**
   - Trong Vercel Dashboard, chọn project
   - Vào tab "Storage"
   - Click "Create Database"
   - Chọn "Postgres"
   - Click "Create"
   - Vercel sẽ tự động thêm environment variables

4. **Chạy Migration**
   ```bash
   # Trên máy local, connect đến Vercel database
   npx prisma migrate deploy
   ```

   Hoặc thêm vào `package.json`:
   ```json
   {
     "scripts": {
       "postinstall": "prisma generate",
       "vercel-build": "prisma migrate deploy && next build"
     }
   }
   ```

5. **Redeploy**
   - Vercel sẽ tự động deploy lại sau khi có database

## 🔒 BẢO MẬT

### Vercel Postgres là an toàn vì:
- ✅ SSL/TLS encryption mặc định
- ✅ Connection pooling tự động
- ✅ Backup tự động
- ✅ Environment variables được mã hóa
- ✅ Miễn phí 256MB storage + 60 hours compute/month

### Các biện pháp bảo mật bổ sung:

1. **Rate Limiting** (thêm vào API routes):
   ```typescript
   // Cài đặt: npm install @upstash/ratelimit @upstash/redis
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";

   const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(10, "10 s"),
   });
   ```

2. **Authentication** (nếu cần):
   - Thêm NextAuth.js cho login
   - Hoặc sử dụng Vercel Authentication

3. **Input Validation**:
   ```typescript
   // Thêm validation vào API
   if (text && text.length > 100) {
     return NextResponse.json({ error: 'Text too long' }, { status: 400 });
   }
   ```

## 📊 GÓI MIỄN PHÍ VERCEL

- **Bandwidth**: 100GB/month
- **Function Executions**: 100GB-hours
- **Postgres Storage**: 256MB
- **Postgres Compute**: 60 hours/month
- **Sufficient cho**: 10-50 users đồng thời

## 🚀 DEPLOY NHANH (Giữ SQLite - chỉ để test)

Nếu chỉ muốn demo/test:
```bash
# Push lên GitHub
git add .
git commit -m "Initial commit"
git push

# Deploy trên Vercel
# Lưu ý: Database sẽ reset mỗi lần deploy!
```

## 📝 KHUYẾN NGHỊ

**Cho production**: Dùng Vercel Postgres (miễn phí, an toàn, ổn định)
**Cho development**: Dùng SQLite (nhanh, đơn giản)
