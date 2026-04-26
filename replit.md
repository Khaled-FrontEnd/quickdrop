# QuickDrop Workspace

## Overview

pnpm workspace monorepo. QuickDrop is a wireless file transfer app — Android/iPhone to laptop over local network.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Mobile App (`artifacts/mobile`)
- **Framework**: Expo (React Native) with Expo Router
- **Preview**: `/` (root path)
- **Workflow**: `artifacts/mobile: expo`

Screens:
- **Home** (`app/index.tsx`): Start/Stop sharing, status indicator, navigation
- **Connection** (`app/connection.tsx`): QR code + URL display + copy button
- **Files** (`app/(tabs)/files.tsx`): File manager — add, view, share, delete files
- **History** (`app/(tabs)/history.tsx`): Transfer history log
- **Settings** (`app/(tabs)/settings.tsx`): Dark mode, hotspot guide, clear history

State:
- `context/ThemeContext.tsx`: Dark/light mode with AsyncStorage persistence
- `context/ServerContext.tsx`: Sharing state, files, history
- `hooks/useColors.ts`: Theme-aware color tokens

Packages: react-native-qrcode-svg, expo-network, expo-document-picker, expo-file-system, expo-sharing, expo-clipboard, @react-native-community/netinfo

### API Server (`artifacts/api-server`)
- **Framework**: Express 5 + TypeScript
- **Preview**: `/api`
- **Workflow**: `artifacts/api-server: API Server`

Routes:
- `GET /api/` — Beautiful web UI for laptop browser (drag & drop, upload, download)
- `GET /api/status` — Server status + connected count
- `GET /api/files` — List uploaded files
- `POST /api/upload-simple` — Upload files from laptop browser
- `GET /api/download/:id` — Download file from phone
- `DELETE /api/files/:id` — Remove file
- `GET /api/healthz` — Health check

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
