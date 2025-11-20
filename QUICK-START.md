# 🚀 Quick Setup Guide

## Cho người mới clone project về

### 1️⃣ Clone Repository
```bash
git clone https://github.com/hidr0c/vhmqueueboard.git
cd vhmqueueboard
```

### 2️⃣ Chạy lệnh setup (tự động tạo .env)
```bash
npm run setup
```

Hoặc thủ công:
```bash
# Tạo .env từ template
copy .env.example .env

# Install dependencies
npm install
```

### 3️⃣ Chạy migrations
```bash
npx prisma migrate deploy
```

### 4️⃣ Chạy dev server
```bash
npm run dev
```

Mở http://localhost:3000

---

## 🐛 Nếu gặp lỗi "Environment variable not found: DATABASE_URL"

### Fix nhanh:
```bash
# Windows
copy .env.example .env

# Mac/Linux
cp .env.example .env
```

Sau đó chạy lại:
```bash
npm run dev
```

---

## 📦 Deploy lên Vercel

⚠️ **QUAN TRỌNG**: SQLite không hoạt động trên Vercel!

### Giải pháp:

1. **Tạo Vercel Postgres Database**:
   - Vào Vercel Dashboard
   - Storage → Create Database → Postgres

2. **Chuyển schema sang PostgreSQL**:
   ```bash
   # Windows
   copy prisma\schema.postgresql.prisma prisma\schema.prisma
   
   # Mac/Linux  
   cp prisma/schema.postgresql.prisma prisma/schema.prisma
   ```

3. **Push code**:
   ```bash
   git add .
   git commit -m "Switch to PostgreSQL"
   git push
   ```

4. **Run migrations**:
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

Chi tiết xem [SWITCH-TO-POSTGRESQL.md](./SWITCH-TO-POSTGRESQL.md)

---

## ✅ Checklist

- [ ] Clone repository
- [ ] Chạy `npm run setup` hoặc copy `.env.example` → `.env`
- [ ] Chạy `npm install`
- [ ] Chạy `npx prisma migrate deploy`
- [ ] Chạy `npm run dev`
- [ ] Mở http://localhost:3000

---

## 🆘 Troubleshooting

### Lỗi: "prisma.config.ts" 
→ File này đã bị xóa. Pull code mới nhất.

### Lỗi: "entries.find is not a function"
→ Đã fix. Pull code mới nhất.

### Lỗi: Build failed on Vercel
→ Phải chuyển sang PostgreSQL (xem hướng dẫn trên)

### Database trống khi chạy lần đầu
→ Bình thường! Refresh trang vài lần để tự động initialize.

---

## 📚 Tài liệu khác

- [README.md](./README.md) - Tổng quan project
- [SWITCH-TO-POSTGRESQL.md](./SWITCH-TO-POSTGRESQL.md) - Deploy Vercel
- [FIX-VERCEL-ERROR.md](./FIX-VERCEL-ERROR.md) - Fix lỗi deploy
