# VHM Queue Board - Bảng Hàng Đợi Real-time

Website quản lý hàng đợi với 12 dòng và 4 cột (Cab Trái P1/P2, Cab Phải P1/P2), hỗ trợ chỉnh sửa real-time và lịch sử thay đổi.

## ✨ Tính Năng

- 📋 **Bảng 12x4**: 12 dòng, 4 cột (2 Cab, mỗi Cab có P1 và P2)
- ✏️ **Chỉnh sửa tự do**: Ghi và xóa nội dung bất kỳ lúc nào
- ☑️ **Checkbox thông minh**: Mỗi Cab chỉ tick được 1 hàng duy nhất
- 🔄 **Real-time sync**: Cập nhật mỗi 2 giây cho tất cả users
- 📜 **Lịch sử**: Xem log tất cả thay đổi với timestamp
- 🎨 **Giao diện rõ ràng**: Màu sắc dễ đọc, responsive

## 🚀 Chạy Local

```bash
# Cài đặt dependencies
npm install

# Chạy migrations
npx prisma migrate dev

# Khởi động dev server
npm run dev
```

Mở trình duyệt: http://localhost:3000

## 🌐 Deploy lên Vercel

⚠️ **QUAN TRỌNG**: SQLite không hoạt động trên Vercel!

### Quick Fix (Chuyển sang PostgreSQL):

**Windows:**
```cmd
switch-to-postgres.bat
```

**Mac/Linux:**
```bash
chmod +x switch-to-postgres.sh
./switch-to-postgres.sh
```

Sau đó làm theo hướng dẫn trong terminal.

### Chi tiết:

Xem file [SWITCH-TO-POSTGRESQL.md](./SWITCH-TO-POSTGRESQL.md) hoặc [FIX-VERCEL-ERROR.md](./FIX-VERCEL-ERROR.md)

**TÓM TẮT:**
1. SQLite không phù hợp cho Vercel (serverless)
2. Nên dùng **Vercel Postgres** (miễn phí 256MB)
3. An toàn với SSL/TLS, backup tự động
4. Đủ cho 10-50 users đồng thời

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Database**: SQLite (local) / PostgreSQL (production)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 🐛 Troubleshooting

### Lỗi "entries.find is not a function"
✅ Đã fix - App giờ validate API response và hiển thị error message rõ ràng

### Lỗi 500 khi deploy Vercel
✅ Đã fix - Thêm error handling và hướng dẫn chuyển sang PostgreSQL

### Database bị reset sau mỗi deploy
⚠️ Đây là dấu hiệu bạn vẫn đang dùng SQLite trên Vercel
→ Phải chuyển sang PostgreSQL như hướng dẫn trên

## 📁 Cấu Trúc

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── queue/          # CRUD operations
│   │   │   └── history/        # History logs
│   │   ├── page.tsx            # Main page
│   │   └── globals.css         # Styles
│   ├── components/
│   │   └── QueueBoard.tsx      # Main component
│   └── lib/
│       └── prisma.ts           # Prisma client
├── prisma/
│   ├── schema.prisma           # Database schema (SQLite)
│   └── schema.prisma.production # For Vercel (PostgreSQL)
└── DEPLOY.md                   # Deployment guide
```

## 🔒 Bảo Mật

Hiện tại: Không có authentication (mọi người đều có quyền chỉnh sửa)

**Để tăng cường bảo mật:**
1. Thêm NextAuth.js cho login
2. Implement rate limiting
3. Add input validation
4. Sử dụng HTTPS (Vercel mặc định)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
