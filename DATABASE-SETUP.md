# Database Setup - PostgreSQL with Prisma Accelerate

## Environment Variables

Add these to your `.env` file (local) and Vercel environment variables:

```env
# Prisma Accelerate URL (required)
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19JeTZIc3A4T25VQmp4b2xyVHlzT2UiLCJhcGlfa2V5IjoiMDFLQUdUNEpBWVlYSzcxQkQyMEtYMzlENEoiLCJ0ZW5hbnRfaWQiOiIyYmNkMmQxZjhjM2I5NGQ4MzAyNDZjZjIzNDgzY2YzZDQ2NzFlN2UyOTRiYWIxY2U4MTc2MmNmMThhOWZmYjNjIiwiaW50ZXJuYWxfc2VjcmV0IjoiYWRhYzk3YTctZjZhNS00Yjc4LTlkN2QtMWUzN2JlYjlmZjFkIn0.Rg6A6snIVQSeu0kHTnAgoEXy2cLEF5gX0NPujhk6fLo"

# Direct PostgreSQL URL (for migrations)
POSTGRES_URL="postgres://2bcd2d1f8c3b94d830246cf23483cf3d4671e7e294bab1ce81762cf18a9ffb3c:sk_Iy6Hsp8OnUBjxolrTysOe@db.prisma.io:5432/postgres?sslmode=require"
```

## Setup Steps

### 1. Update Local Environment

Create `.env` file in project root:

```bash
# Copy from above or run:
echo PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY" > .env
echo POSTGRES_URL="postgres://YOUR_CONNECTION_STRING" >> .env
```

### 2. Generate Prisma Client

Run the batch file:
```bash
update-prisma.bat
```

Or manually:
```bash
npx prisma generate
npx prisma migrate deploy
```

### 3. Configure Vercel

Go to your Vercel project → Settings → Environment Variables:

Add these variables:
- `PRISMA_DATABASE_URL` = (Accelerate URL from above)
- `POSTGRES_URL` = (Direct PostgreSQL URL from above)

### 4. Deploy

```bash
git add .
git commit -m "feat: switch to PostgreSQL with Prisma Accelerate"
git push
```

Vercel will automatically deploy with the new configuration.

## What Changed

### Schema Updates
- ✅ Changed from SQLite to PostgreSQL
- ✅ Updated datasource configuration
- ✅ Using Prisma Accelerate for connection pooling
- ✅ Default `checked` value changed to `false`

### Benefits of Prisma Accelerate
- 🚀 **Connection pooling**: Better performance on serverless
- 🚀 **Edge caching**: Faster read queries
- 🚀 **Global CDN**: Lower latency worldwide
- 🚀 **Auto-scaling**: Handles traffic spikes

## Troubleshooting

### "Provider sqlite is not supported"
✅ **Fixed** - Schema now uses PostgreSQL

### "URL must start with protocol file:"
✅ **Fixed** - Using proper PostgreSQL URLs

### Migration Issues
If you see migration errors, reset and redeploy:

```bash
npx prisma migrate reset --force
npx prisma migrate deploy
```

### Vercel Build Fails
Make sure environment variables are set in Vercel dashboard before deploying.

## Verification

After deployment, check:

1. **Vercel Logs**: Should show successful database connection
2. **Application**: Should load without errors
3. **API Routes**: Test GET /api/queue

If you see data loading properly, the migration is successful! 🎉
