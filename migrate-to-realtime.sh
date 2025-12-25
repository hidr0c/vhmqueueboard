#!/bin/bash

# VHM Queue Board - Real-time Migration Script
# This script helps you migrate from polling to Pusher real-time sync

echo "🚀 VHM Queue Board - Real-time Sync Migration"
echo "=============================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "📝 IMPORTANT: You need to add Pusher credentials to .env:"
    echo "   1. Sign up at https://pusher.com"
    echo "   2. Create a Channels app"
    echo "   3. Copy credentials to .env:"
    echo "      - PUSHER_APP_ID"
    echo "      - PUSHER_SECRET"
    echo "      - NEXT_PUBLIC_PUSHER_KEY"
    echo "      - NEXT_PUBLIC_PUSHER_CLUSTER"
    echo ""
    echo "   See PUSHER-SETUP.md for detailed instructions"
    echo ""
    read -p "Press Enter after you've added Pusher credentials to .env..."
else
    echo "✅ .env file exists"
fi

echo ""
echo "📦 Installing dependencies (including Pusher)..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ npm install failed. Please check errors above."
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "🔍 Checking Pusher credentials..."

# Simple check if Pusher vars are in .env
if grep -q "PUSHER_APP_ID=\"your_app_id\"" .env; then
    echo ""
    echo "⚠️  WARNING: Pusher credentials not configured!"
    echo "   Your .env still has placeholder values."
    echo ""
    echo "   👉 Please edit .env and add real Pusher credentials"
    echo "   👉 See PUSHER-SETUP.md for step-by-step guide"
    echo ""
    read -p "Press Enter when ready to continue..."
fi

echo ""
echo "🎉 Migration complete!"
echo ""
echo "Next steps:"
echo "  1. Verify Pusher credentials in .env"
echo "  2. Run: npm run dev"
echo "  3. Open http://localhost:3000"
echo "  4. Look for 🟢 Real-time indicator in top-right"
echo "  5. Test with 2 browser tabs"
echo ""
echo "📖 Documentation:"
echo "  - PUSHER-SETUP.md - Detailed Pusher setup guide"
echo "  - REALTIME-MIGRATION.md - What changed in this migration"
echo "  - README.md - General usage guide"
echo ""
echo "Happy real-time coding! 🚀"
