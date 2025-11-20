# QUAN TRỌNG: Chuyển Sang PostgreSQL Cho Vercel

## ⚠️ Lỗi hiện tại

```
Failed to load resource: the server responded with a status of 500
```

**Nguyên nhân**: SQLite không hoạt động trên Vercel (serverless environment)

## ✅ Giải pháp: Chuyển sang PostgreSQL

### Bước 1: Tạo Vercel Postgres Database

1. Vào Vercel Dashboard: https://vercel.com/dashboard
2. Chọn project của bạn
3. Vào tab **"Storage"**
4. Click **"Create Database"**
5. Chọn **"Postgres"**
6. Chọn region (Singapore/Tokyo cho VN)
7. Click **"Create"**
8. ✅ Vercel tự động thêm environment variables

### Bước 2: Cập nhật Prisma Schema

Sửa file `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

model QueueEntry {
  id        Int      @id @default(autoincrement())
  rowIndex  Int
  side      String
  position  String
  text      String   @default("")
  checked   Boolean  @default(false)
  updatedAt DateTime @default(now())
  
  @@unique([rowIndex, side, position])
}

model HistoryLog {
  id        Int      @id @default(autoincrement())
  rowIndex  Int
  side      String
  position  String
  action    String
  oldValue  String?
  newValue  String?
  timestamp DateTime @default(now())
}
```

### Bước 3: Push Changes

```bash
git add prisma/schema.prisma
git commit -m "Switch to PostgreSQL for Vercel"
git push origin main
```

Vercel sẽ tự động redeploy!

### Bước 4: Chạy Migrations

**Option A: Qua Vercel CLI (Dễ nhất)**

```bash
# Cài Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Chạy migration
npx prisma migrate deploy
```

**Option B: Qua Prisma Studio**

```bash
# Pull env vars
vercel env pull .env.local

# Generate Prisma Client với PostgreSQL
npx prisma generate

# Tạo migration mới
npx prisma migrate dev --name init_postgres

# Deploy lên Vercel database
npx prisma migrate deploy
```

### Bước 5: Verify

Mở lại website: `https://your-project.vercel.app`

Nếu thấy bảng trống → Thành công! ✅

## 🔄 Quay lại SQLite cho Local Development

Tạo file `prisma/schema.local.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// ... models giống như trên
```

Khi dev local:
```bash
# Copy schema
cp prisma/schema.local.prisma prisma/schema.prisma

# Run dev
npm run dev
```

## 📊 Chi phí

**Vercel Postgres Free Tier:**
- ✅ 256MB storage
- ✅ 60 hours compute/month
- ✅ Đủ cho 10-50 users đồng thời
- ✅ 100% miễn phí!

## 🆘 Troubleshooting

### Vẫn lỗi 500 sau khi switch?

1. **Kiểm tra Environment Variables**:
   - Vercel Dashboard > Settings > Environment Variables
   - Phải có `POSTGRES_PRISMA_URL` và `POSTGRES_URL_NON_POOLING`

2. **Chạy lại migration**:
   ```bash
   npx prisma migrate deploy
   ```

3. **Check logs**:
   - Vercel Dashboard > Deployment > Logs
   - Tìm error message chi tiết

4. **Redeploy manually**:
   - Vercel Dashboard > Deployments > ... > Redeploy

### Database trống?

Chạy initialize API:
```bash
curl -X POST https://your-project.vercel.app/api/queue \
  -H "Content-Type: application/json" \
  -d '{"action":"initialize"}'
```

Hoặc mở website và refresh vài lần - sẽ tự động initialize.

## ✅ Hoàn tất!

Sau khi làm theo các bước trên, website sẽ hoạt động hoàn hảo trên Vercel! 🎉
