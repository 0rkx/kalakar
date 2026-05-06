# Kalakar

Kalakar brings together AI-assisted workflow and web application UI capabilities based on the code in this repository.

## Overview

This README documents the current implementation of `kalakar`. It is based on the checked-in source files, package manifests, and entry points in the repository.

## What It Covers

- AI-assisted workflow
- web application UI
- backend API
- forms and data collection
- commerce or inventory operations

## Features

- Role-based dashboards and navigation
- Document intake, upload, and parsing flows
- Review queues, status tracking, and task/work-item states
- Image upload, preview, processing, and retry states
- Gemini/OpenAI integration points for AI-assisted processing
- Supplier, inventory, order, or product management flows

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS

## Code Highlights

- Entry points: index.html, src/App.tsx, src/index.tsx
- UI components: AIAssistantScreen, BackendConnectionTest, BottomNavigation, Chatbot, ContentBooster, ConversationHistory, ConversationInterface, ConversationRecovery, ConversationSummary, Dashboard, DebugScreen, EnhancedProductDemo
- JavaScript tooling and scripts are declared in package.json.

## Project Structure

- `index.html`
- `package.json`
- `tailwind.config.js`
- `tsconfig.json`
- `vite.config.ts`
- `backend/package-lock.json`
- `backend/package.json`
- `backend/server.js`
- `functions/package.json`
- `functions/tsconfig.json`
- `src/App.tsx`
- `src/firebase.ts`
- `src/index.tsx`
- `src/react-app-env.d.ts`
- `src/setupTests.ts`
- `src/tsconfig.json`
- `src/types.ts`
- `src/components/AIAssistantScreen.tsx`

## Getting Started

Clone the repository and install the dependencies for the part of the project you want to run.

### Frontend / Node

```bash
npm install
npm run dev
```

### Available Scripts

- `dev`: `vite`
- `start`: `vite`
- `build`: `vite build`
- `preview`: `vite preview`
- `test`: `jest`
- `test:watch`: `jest --watch`
- `test:coverage`: `jest --coverage`
- `test:ci`: `jest --ci --coverage --watchAll=false`
- `backend:dev`: `cd backend && npm run dev`
- `backend:start`: `cd backend && npm start`
- `functions:dev`: `cd functions && npm run serve`
- `functions:deploy`: `cd functions && npm run deploy`
- `deploy:frontend`: `npm run build && firebase deploy --only hosting`
- `deploy:functions`: `cd functions && npm run build && firebase deploy --only functions`
- `deploy:all`: `npm run build && cd functions && npm run build && cd .. && firebase deploy`
- `setup`: `npm install && cd backend && npm install && cd ../functions && npm install && cd ..`
- `clean`: `rm -rf dist node_modules backend/node_modules functions/node_modules functions/lib`

## Environment Variables

The code references these environment keys:

- `AMAZON_ACCESS_KEY`
- `AMAZON_CLIENT_ID`
- `AMAZON_CLIENT_SECRET`
- `AMAZON_SECRET_KEY`
- `AMAZON_SELLER_ID`
- `ETSY_API_KEY`
- `ETSY_CLIENT_ID`
- `ETSY_CLIENT_SECRET`
- `ETSY_SHOP_ID`
- `FIREBASE_AUTH_URI`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_CLIENT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_TOKEN_URI`
- `FUNCTIONS_EMULATOR`
- `GCLOUD_PROJECT`
- `GEMINI_API_KEY`
- `NODE_ENV`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_PROJECT_ID`

## Development Notes

- Keep generated files, dependency folders, virtual environments, and build outputs out of commits.
- Add screenshots or deployment links here when the project is running in production.
- Update this README when entry points, environment variables, or setup steps change.
