# Contributing to VHM Queue Board

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm hoặc yarn
- Git

### Setup Development Environment

1. **Clone repository**
   ```bash
   git clone https://github.com/hidr0c/vhmqueueboard.git
   cd vhmqueueboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   Script này sẽ tự động:
   - Tạo file `.env` nếu chưa có
   - Generate Prisma Client

3. **Setup database**
   ```bash
   npx prisma migrate dev
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. Mở http://localhost:3000

## 📁 Project Structure

```
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   ├── queue/      # Queue CRUD
│   │   │   └── history/    # History logs
│   │   ├── page.tsx        # Home page
│   │   └── layout.tsx      # Root layout
│   ├── components/         # React components
│   │   └── QueueBoard.tsx  # Main board component
│   └── lib/
│       └── prisma.ts       # Prisma client singleton
├── prisma/
│   ├── schema.prisma       # Database schema (SQLite for local)
│   ├── schema.postgresql.prisma  # For Vercel deployment
│   └── migrations/         # Database migrations
├── scripts/
│   └── check-env.js        # Auto-create .env script
└── public/                 # Static files
```

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma studio        # Open Prisma Studio (GUI)
npx prisma migrate dev   # Create & apply migration
npx prisma generate      # Generate Prisma Client

# Setup
npm run setup            # Auto-setup .env + install
```

## 🐛 Troubleshooting

### Error: "DATABASE_URL not found"
```bash
npm run setup
```

### Database out of sync
```bash
npx prisma migrate reset
npx prisma migrate dev
```

### Build errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

## 📝 Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Follow existing code style
   - Add comments for complex logic

3. **Test locally**
   ```bash
   npm run dev
   # Test all features manually
   ```

4. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 🎯 Development Tips

### Local Development
- Uses SQLite (`dev.db`)
- Database file is git-ignored
- Changes persist locally

### Production (Vercel)
- Requires PostgreSQL
- See [SWITCH-TO-POSTGRESQL.md](./SWITCH-TO-POSTGRESQL.md)
- Environment variables auto-configured

### Real-time Updates
- Polling every 2 seconds
- No WebSocket (to keep it simple)
- Works well for 10-50 concurrent users

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel Deployment](https://vercel.com/docs)

## ❓ Questions?

Open an issue or contact the maintainer!
