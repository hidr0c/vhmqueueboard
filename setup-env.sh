#!/bin/bash
echo "Checking .env file..."
echo ""

if [ -f .env ]; then
    echo "✅ .env file already exists"
else
    echo "⚠️  .env file not found"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created successfully!"
    echo ""
    echo "You can now run: npm run dev"
fi

echo ""
