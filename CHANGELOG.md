# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-10-03

First versioned release. Captures the API as it was running in production on
Render before NFL support was added.

### Added
- Fastify + TypeScript server streaming live updates over Server-Sent Events.
- `GET /api/live-games` SSE stream for connected dashboard clients.
- `GET /api/games` debug endpoint returning the latest aggregated game snapshot.
- `GET /health` health check endpoint.
- Polling refresh loop that broadcasts updates to all connected clients (`SseManager`).
- MLB game data aggregation (`GameService`):
  - Live and concluded game data, including inning-by-inning scoring.
  - Upcoming game data, with the start time passed as an ISO date.
  - Current pitcher during live games.
  - Batting leaders and pitching leaders.
  - NL division standings.
  - Postponed game handling, with postponed details expiring after the game date.
- Configurable refresh intervals per dashboard module.
- NHL data aggregation (`NHLGameService`), including player stats and period scoring.
- Weather data via Open-Meteo, plus formatted date data for the dashboard.
- Production build and Render deployment configuration.
- GitHub Actions workflow for CI builds.
- `.nvmrc` to pin the Node.js version.

### Changed
- Refactored `GameService` game lookup logic (`lastPk` / `nextPk`) for
  readability and efficiency (PR #1).

### Fixed
- Error handling when pitching leader data is missing.
- TypeScript node types issue that broke CI.
- Deployment issues on Render.

[Unreleased]: https://github.com/bnerra/info-ticker-api/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/bnerra/info-ticker-api/releases/tag/v1.0.0