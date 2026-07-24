# Info Ticker API

A real-time sports and data aggregation API built with **Fastify + TypeScript**, delivering live updates via **Server-Sent Events (SSE)**.

The service aggregates data from external sports and weather APIs and streams structured updates to connected clients.

---

## 🚀 Features

- ⚡ Real-time updates via Server-Sent Events (SSE)
- 🏟️ Live MLB game data aggregation
- 🏒 NHL game data support (COMING SOON)
- 🌤️ Weather data integration (Open-Meteo)
- 🔁 Automatic refresh loop with broadcast system
- 🌐 Static frontend hosting (production deployment support)
- 🧠 Modular service architecture

---

## 🧱 Tech Stack

- Node.js (v20+)
- Fastify
- TypeScript
- Server-Sent Events (SSE)
- Lodash (data transformation utilities)

---

## 📡 Live Endpoints

### Health Check
```bash
GET /health
```

### Live SSE Stream
```bash
GET /api/live-games
```

Streams real-time updates to connected clients

### Debug Endpoint
```bash
GET /api/games
```

Returns the latest aggregated game state snapshot.

---

## 🔌 Architecture Overview

The API is built around a central service loop:

1. External sports APIs are polled on an interval
2. Data is normalized and merged into a single game state
3. Connected SSE clients receive real-time updates

Core components:

- `GameService` → MLB data aggregation
- `NHLGameService` → NHL data aggregation
- `SseManager` → client connection handling
- `routes/sse.ts` → SSE endpoint

---

## ⚙️ Local Development

### Install dependencies
```bash
npm install
```

### Run in development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Run production build
```bash
npm run start
```

---

## 🌐 Deployment

Designed for deployment on platforms such as:
- Render (recommended)
- Railway
- Fly.io

### Example build command (Render)
```bash
npm install --include=dev && npm run build
```

---

## 🧠 Notes

- SSE connections are persistent and scale with concurrent users
- Data refresh interval is configurable in ```index.ts```
- Designed for dashboard-style real-time UIs
