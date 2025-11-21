# Performance Optimizations for Vercel Free Tier

This document outlines the optimizations implemented to ensure smooth operation on Vercel's free tier.

## Rate Limiting

### Implementation
- **In-memory rate limiter** (`src/lib/rateLimit.ts`) that tracks requests per IP
- Automatically cleans up old entries every minute
- Returns rate limit headers for transparency

### Limits by Endpoint
- **GET /api/queue**: 60 requests/minute
- **POST /api/queue**: 10 requests/minute (initialization)
- **PATCH /api/queue/[id]**: 30 requests/minute
- **DELETE /api/queue/[id]**: 20 requests/minute
- **GET /api/history**: 30 requests/minute

### Rate Limit Headers
All responses include:
- `X-RateLimit-Remaining`: Number of requests left in current window
- `X-RateLimit-Reset`: When the limit resets (ISO 8601 timestamp)
- `Retry-After`: Seconds to wait before retrying (on 429 errors)

## Frontend Optimizations

### Input Debouncing
- **800ms debounce** on text input to reduce API calls
- Immediate UI update for responsive feel
- Server sync happens after user stops typing

### Smart Polling
- **3-second intervals** (reduced from 2s to save bandwidth)
- Abort controller to cancel pending requests
- Pause/resume polling button for user control
- Only polls history when visible

### Optimistic Updates
- UI updates immediately on changes
- Server refresh happens in background
- Reduces perceived latency

### Request Cancellation
- Previous requests are cancelled when new ones are made
- Prevents race conditions and wasted bandwidth

## Database Optimizations

### Query Optimization
- Indexed fields for faster lookups (rowIndex, side, position)
- Batch operations where possible
- Limit history to last 100 entries

### Connection Pooling
- Prisma handles connection pooling automatically
- Configured for serverless (short-lived connections)

## Vercel Configuration

### serverless Function Limits
- **10-second timeout** for API routes
- Prevents hanging functions on free tier

### Caching Headers
- `Cache-Control: no-store, max-age=0` for real-time data
- Ensures users always see latest data

## Monitoring Tips

### Check Rate Limits
Monitor browser console for rate limit warnings:
```javascript
// Look for these messages:
"Rate limited: ..."
"Rate limited on update"
"Rate limited on delete"
```

### Check Network Tab
1. Open DevTools → Network tab
2. Look for response headers:
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`
3. 429 status codes indicate rate limiting

### Adjust If Needed

If you hit rate limits frequently:

1. **Increase polling interval** in `QueueBoard.tsx`:
   ```typescript
   }, 3000); // Change to 5000 for 5 seconds
   ```

2. **Increase debounce delay**:
   ```typescript
   debounce((id: number, text: string) => {
       updateEntry(id, { text });
   }, 800), // Change to 1000 or 1500
   ```

3. **Reduce concurrent users** or upgrade to paid tier

## Best Practices

### For Development
- Use pause button (⏸️) when not actively testing
- Avoid rapid clicking/typing during tests
- Monitor console for rate limit warnings

### For Production
- Consider upgrading to Pro tier for higher limits
- Use Vercel Analytics to monitor usage
- Consider Redis/Vercel KV for distributed rate limiting

## Expected Performance

### Free Tier Limits
- ✅ **Up to 5 concurrent users** comfortably
- ✅ **~10-15 active users** with occasional rate limits
- ⚠️ **20+ users** will experience throttling

### Response Times
- **GET requests**: 50-150ms average
- **POST/PATCH requests**: 100-300ms average
- **Database queries**: <50ms

## Troubleshooting

### "Too many requests" errors
- **Solution**: Wait for rate limit to reset (60 seconds max)
- **Prevention**: Enable polling pause when idle

### Slow response times
- **Cause**: Cold starts on serverless functions
- **Solution**: First request may be slow (500-1000ms), subsequent requests are fast

### Input lag/delay
- **Check**: Debounce is working (800ms delay is normal)
- **Solution**: UI updates immediately, server sync is deferred

## Future Improvements

For high-traffic scenarios, consider:
1. **Vercel KV** for distributed rate limiting
2. **Vercel Cron** for background cleanup jobs
3. **WebSockets/SSE** for real-time updates (less polling)
4. **Edge Functions** for lower latency
5. **CDN caching** for static assets
