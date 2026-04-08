# StyleSync

StyleSync is a MERN web application for the Purple Merit assessment. It ingests a website URL, extracts brand-like design tokens, lets users lock and edit those tokens, tracks version history, and previews a live component library powered by CSS custom properties.

## Stack

- React + Vite
- Node.js + Express
- MongoDB + Mongoose
- CSS custom properties for the live design system preview

## Features

- URL ingestion with graceful fallback when scanning is blocked
- Token extraction for colors, typography, and spacing heuristics
- Real-time editing for colors, type families, and spacing scale
- Lock/unlock token controls to preserve user overrides
- Version history audit trail for scrape/edit cycles
- Live UI kit preview for buttons, inputs, cards, and type specimens
- Export panel for CSS variable output and JSON design tokens
- Responsive dashboard with loading skeletons and failure messaging

## Project Structure

```text
stylesync/
  client/   React frontend
  server/   Express API + scraping + Mongo models
```

## Setup

### 1. Install dependencies

```bash
npm install
npm run install:all
```

### 2. Configure environment

Copy [server/.env.example](/e:/AssignmentPurplemerit/server/.env.example) to `server/.env` and set:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/stylesync
CLIENT_URLS=http://localhost:5173,http://127.0.0.1:4173,http://127.0.0.1:5173
```

Create `client/.env` if you want to override the API base URL:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run MongoDB

Use a local MongoDB instance or point `MONGODB_URI` to MongoDB Atlas.

### 4. Start the app

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## Available Scripts

- `npm run dev` starts client and server together
- `npm run build` builds the React frontend
- `npm run start` runs the Express server

## API Overview

- `POST /api/sites/scrape` scrape or re-scrape a URL
- `GET /api/sites` list recent analyses
- `GET /api/sites/:siteId` fetch one site with recent versions
- `PATCH /api/sites/:siteId/tokens` update a token by path
- `POST /api/sites/:siteId/lock` toggle a locked token path
- `GET /api/sites/:siteId/versions` fetch version history

## MongoDB Schema Notes

The assessment brief asked for PostgreSQL, but this implementation intentionally uses MongoDB because you explicitly requested a strict MERN stack. The schema is modeled as Mongoose collections:

- `sites`
- `versionhistories`

This Mongo model covers the same functional requirements as the relational versioning design in the brief.

## Submission Checklist

- Push this repo to a public GitHub repository
- Deploy frontend to Vercel or Netlify
- Deploy backend to Render, Railway, or another Node host
- Use MongoDB Atlas for production
- Record a 2-3 minute demo showing scrape, edit, lock, version history, and preview flows
- Add three extracted-style screenshots after testing:
  - `docs/screenshots/corporate.png`
  - `docs/screenshots/creative.png`
  - `docs/screenshots/ecommerce.png`

## Deployment Notes

- Set `VITE_API_URL` in the frontend host to your backend URL + `/api`
- Set `CLIENT_URLS` in the backend host to your frontend URL
- Use MongoDB Atlas for the hosted database

## Known Tradeoffs

- Some heavily bot-protected sites will force fallback mode instead of full live extraction
- The scraper currently uses HTTP + CSS analysis rather than a full headless browser runtime
- Image palette extraction depends on image accessibility from the target website
