#!/bin/bash

echo "🚀 Setting up Server Project..."
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✓ .env file already exists"
else
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✓ .env file created"
    echo "⚠️  Please edit .env with your actual credentials"
fi

# Check if firebase service account exists
if [ -f "src/config/firebase-service-account.json" ]; then
    echo "✓ Firebase service account file exists"
else
    echo "⚠️  Firebase service account file is missing!"
    echo "   Please download it from Firebase Console and save as:"
    echo "   src/config/firebase-service-account.json"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your credentials"
echo "2. Add firebase-service-account.json to src/config/"
echo "3. Run 'npm run dev' to start the development server"
echo ""
