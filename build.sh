#!/usr/bin/env bash
set -e

# Install pnpm to a writable directory (Render's /usr/lib is read-only)
npm install -g pnpm --prefix /opt/render/.npm-global
export PATH="/opt/render/.npm-global/bin:$PATH"

pnpm install

BASE_PATH=/ PORT=3000 pnpm --filter @workspace/loan-tracker run build
pnpm --filter @workspace/api-server run build
cp -r artifacts/loan-tracker/dist/public artifacts/api-server/dist/public
