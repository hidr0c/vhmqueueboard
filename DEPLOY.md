# Hướng Dẫn Deploy Lên Vercel

## ⚠️ QUAN TRỌNG - DATABASE

SQLite **KHÔNG hoạt động** trên Vercel vì serverless environment. Bạn PHẢI dùng **Vercel Postgres**.

## 🚀 BƯỚC 1: Push Code Lên GitHub

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

## 🌐 BƯỚC 2: Deploy Lên Vercel

1. Truy cập: https://vercel.com
2. Click **"Add New"** > **"Project"**
3. **Import** repository GitHub của bạn
4. Click **"Deploy"** (sẽ fail lần đầu vì chưa có database - đây là bình thường!)

## 💾 BƯỚC 3: Thêm Vercel Postgres Database

1. Trong **Vercel Dashboard**, chọn project vừa tạo
2. Vào tab **"Storage"**
3. Click **"Create Database"**
4. Chọn **"Postgres"**
5. Chọn region gần bạn nhất (Singapore/Tokyo cho VN)
6. Click **"Create"**
7. **Vercel sẽ tự động thêm environment variables:**
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

## 🔧 BƯỚC 4: Cập Nhật Prisma Schema

Sửa file `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

## 📦 BƯỚC 5: Push Changes

```bash
git add prisma/schema.prisma
git commit -m "Update to PostgreSQL for Vercel"
git push origin main
```

Vercel sẽ tự động redeploy!

## ✅ BƯỚC 6: Chạy Migrations (LẦN DUY NHẤT)

Sau khi deploy thành công, bạn cần chạy migrations 1 lần:

**Option 1: Qua Vercel CLI (Khuyến nghị)**
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

**Option 2: Qua Local Machine**
```bash
# Copy POSTGRES_PRISMA_URL từ Vercel Settings > Environment Variables
# Paste vào .env.local

# File .env.local:
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# Chạy migration
npx prisma migrate deploy
```

**Option 3: Qua Prisma Studio (Dễ nhất)**
```bash
# Pull env vars từ Vercel
vercel env pull .env.local

# Mở Prisma Studio
npx prisma studio

# Database sẽ tự động tạo tables khi bạn truy cập
```

## 🎉 HOÀN TẤT!

Website của bạn giờ đã live tại: `https://your-project.vercel.app`

## 🔒 BẢO MẬT

### Vercel Postgres - Miễn phí & An toàn:
- ✅ **256MB storage** miễn phí
- ✅ **60 hours compute/tháng**
- ✅ **SSL/TLS encryption** tự động
- ✅ **Connection pooling**
- ✅ **Backup tự động**
- ✅ **Đủ cho 10-50 users đồng thời**

### Tăng cường bảo mật (Tùy chọn):

1. **Rate Limiting**:
```bash
npm install @upstash/ratelimit @upstash/redis
```

2. **Input Validation**:
Thêm vào API routes:
```typescript
if (text && text.length > 200) {
  return NextResponse.json({ error: 'Text too long' }, { status: 400 });
}
```

3. **CORS Protection** (nếu cần):
```typescript
// next.config.ts
headers: async () => [
  {
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: 'your-domain.com' }
    ]
  }
]
```

## 🐛 TROUBLESHOOTING

### Lỗi "Prisma Client not generated"
```bash
# Chạy trên local
npm run postinstall

# Hoặc
npx prisma generate

# Push lại
git add .
git commit -m "Fix: Add prisma generate"
git push
```

### Lỗi "Database connection failed"
- Kiểm tra environment variables trong Vercel Settings
- Đảm bảo đã tạo Postgres database
- Chạy lại migrations: `npx prisma migrate deploy`

### Database bị reset sau mỗi deploy
- Đây là dấu hiệu bạn vẫn đang dùng SQLite
- Phải chuyển sang PostgreSQL như hướng dẫn trên

## 📊 MONITOR

Theo dõi usage tại Vercel Dashboard:
- **Analytics**: Traffic, visitors
- **Logs**: API errors, performance
- **Storage**: Database size, queries/month

## 💰 PRICING (Miễn Phí)

Vercel Hobby Plan (Free):
- ✅ Unlimited websites
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ CI/CD với GitHub
- ✅ Postgres: 256MB + 60h compute

**Hoàn toàn đủ cho project này!** 🎉
