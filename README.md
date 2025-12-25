# VHM Queue Board

A real-time queue management system designed for arcade gaming centers, specifically created to manage player queues at the maimai arcade cabinets at Dreamkids Van Hanh Mall (VHM). The system allows multiple users to view and edit the queue simultaneously, with changes synced in real-time across all connected devices.

## Background

This project originated from the need to organize crowded maimai queues at Dreamkids Van Hanh Mall, where there was no existing queue board system. It also served as a testing ground for real-time web technologies.

## Features

### Queue Management
- **Dual Cabinet Support**: Manages queues for two arcade cabinets (Left Cab and Right Cab) simultaneously
- **12 Queue Slots per Cabinet**: Each cabinet has 12 numbered queue positions
- **Player Pair Tracking**: Each queue slot supports two players (P1 and P2) for cooperative or versus play

### Real-Time Synchronization
- **Pusher Integration**: Live updates across all connected devices using Pusher WebSocket technology
- **Optimistic UI Updates**: Immediate visual feedback when making changes, without waiting for server response
- **Race Condition Prevention**: Implements per-entry locking and pending operation tracking to prevent data conflicts during rapid user interactions
- **Connection State Indicator**: Visual feedback showing real-time connection status (connecting, connected, disconnected)

### Data Entry
- **Text Normalization**: Automatically converts Vietnamese diacritics and special characters to standard English for consistent display
- **Debounced Input**: Reduces API calls by batching rapid text changes (500ms delay)
- **Clear Entry/Row Operations**: Single-click clearing of individual entries or entire rows

### Current Turn Tracking
- **Checkbox System**: Mark which queue position is currently playing
- **Exclusive Selection**: Only one queue position can be marked as "currently playing" per cabinet

### History Logging
- **Change History**: Tracks all modifications to the queue (text changes, check/uncheck actions)
- **Timestamps**: Records the time of each change in local timezone format
- **Scrollable History View**: Toggle-able history panel with scrollable log of all changes

### Database Support
- **PostgreSQL Support**: Production-ready with PostgreSQL (recommended for Vercel deployment)
- **SQLite Support**: Local development option with SQLite
- **Prisma ORM**: Type-safe database access with automatic migrations

### Rate Limiting
- Protects the API from excessive requests with configurable rate limiting

### Deployment
- **Vercel Ready**: Configured for easy deployment to Vercel
- **Environment Variable Configuration**: Flexible configuration through environment variables
- **Migration Scripts**: Includes helper scripts for database setup and migration

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (production) / SQLite (development)
- **ORM**: Prisma
- **Real-Time**: Pusher

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (for production) or SQLite (for local development)
- Pusher account (optional, for real-time sync)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/hidr0c/vhmqueueboard.git
   cd vhmqueueboard
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database and Pusher credentials.

4. Generate Prisma client and run migrations
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PRISMA_DATABASE_URL` | PostgreSQL connection string with Prisma connection pooling |
| `POSTGRES_URL` | Direct PostgreSQL connection URL |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher public key for client-side connection |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher cluster region |
| `PUSHER_APP_ID` | Pusher application ID |
| `PUSHER_SECRET` | Pusher secret key |

## License

This project is open source and available under the MIT License.
