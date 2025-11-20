# Quick Setup Guide

## ⚡ TL;DR (Quá ngắn gọn)

```bash
git clone https://github.com/hidr0c/vhmqueueboard.git
cd vhmqueueboard
npm install
npx prisma migrate dev
npm run dev
```

Mở: http://localhost:3000

## 📋 Từng Bước Chi Tiết

### 1. Clone Project

```bash
git clone https://github.com/hidr0c/vhmqueueboard.git
cd vhmqueueboard
```

### 2. Install Dependencies

```bash
npm install
```

Nếu gặp lỗi, thử:
```bash
npm cache clean --force
npm install
```

### 3. Setup Database

File `.env` sẽ tự động được tạo. Nếu không, chạy:

**Windows:**
```cmd
setup-env.bat
```

**Mac/Linux:**
```bash
chmod +x setup-env.sh
./setup-env.sh
```

Hoặc tạo thủ công file `.env`:
```
DATABASE_URL="file:./dev.db"
```

### 4. Run Migrations

```bash
npx prisma migrate dev
```

Lệnh này sẽ:
- Tạo database file `prisma/dev.db`
- Tạo tables `QueueEntry` và `HistoryLog`
- Generate Prisma Client

### 5. Start Dev Server

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:3000**

## ✅ Kiểm Tra

Website chạy đúng khi:
- ✅ Thấy bảng với 12 hàng
- ✅ 2 cột "Cab Trái" và "Cab Phải"
- ✅ Mỗi cột có P1 và P2
- ✅ Có checkbox và input fields
- ✅ Có nút "Xem lịch sử"

## 🐛 Lỗi Thường Gặp

### "DATABASE_URL not found"
**Fix:**
```bash
npm run setup
```

### "Prisma Client not generated"
**Fix:**
```bash
npx prisma generate
```

### Port 3000 đã được sử dụng
**Fix:**
```bash
# Sử dụng port khác
npm run dev -- -p 3001
```

### Migration errors
**Fix:**
```bash
# Reset database
npx prisma migrate reset
npx prisma migrate dev
```

## 🎯 Next Steps

- Đọc [README.md](./README.md) để biết về features
- Xem [CONTRIBUTING.md](./CONTRIBUTING.md) để contribute
- Deploy lên Vercel? Xem [SWITCH-TO-POSTGRESQL.md](./SWITCH-TO-POSTGRESQL.md)

## 💡 Pro Tips

1. **Xem database:** `npx prisma studio`
2. **Reset tất cả:** `npx prisma migrate reset`
3. **Check logs:** Mở DevTools Console
4. **Test real-time:** Mở 2 tabs cùng lúc

Happy coding! 🚀
