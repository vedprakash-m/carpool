#!/bin/bash
set -e

echo "🚀 Starting vCarpool frontend deployment..."

# Navigate to the workspace root
cd /github/workspace

echo "📦 Installing workspace dependencies..."
npm ci

echo "🔧 Building shared package..."
cd shared
npm run build
cd ..

echo "📋 Copying shared package to frontend..."
mkdir -p frontend/node_modules/@vcarpool
cp -r shared/dist/* frontend/node_modules/@vcarpool/
cp shared/package.json frontend/node_modules/@vcarpool/

echo "🎯 Building frontend..."
cd frontend
npm run build

echo "✅ Frontend deployment completed successfully!" 