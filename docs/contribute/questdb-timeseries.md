# QuestDB Time-Series Integration

**Status:** On Hold  
**Author:** Andrea Palmi (andrea@flowfuse.com)  
**Last Updated:** 2026-05-19

## Overview

This document describes the work done to integrate QuestDB as a time-series database for FlowFuse. The goal is to give Node-RED instances and devices access to QuestDB for high-throughput time-series data — metrics, audit analytics, and custom flow data — through a Node-RED node package (`@flowfuse/nr-questdb`) that auto-configures itself when running on FlowFuse, removing the need for manual per-instance configuration.

The integration supports both **FlowFuse Cloud** and **self-hosted** deployments:

- **FlowFuse Cloud / Docker Compose:** QuestDB runs as a managed service alongside the platform. Node-RED instances receive connection config automatically via the FlowFuse API.
- **Self-hosted / Standalone:** The same Node-RED nodes can be configured manually with any QuestDB instance, independent of FlowFuse.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  FlowFuse Platform                                          │
│                                                             │
│  flowforge.yml                                              │
│  ┌─────────────────────┐                                    │
│  │ timeseries:          │                                   │
│  │   enabled: true      │                                   │
│  │   questdb:            │                                  │
│  │     ilp: ...         │                                   │
│  │     pgwire: ...      │                                   │
│  └────────┬────────────┘                                    │
│           │                                                 │
│  ┌────────▼────────────┐     ┌───────────────────────────┐  │
│  │ GET /api/v1/         │     │ Team-Type Feature Flag    │  │
│  │   timeseries/config  │◄────│ "timeseries" must be ON   │  │
│  │                      │     └───────────────────────────┘  │
│  │ Auth: Bearer token   │                                   │
│  │ (project or device)  │                                   │
│  └────────┬────────────┘                                    │
│           │                                                 │
└───────────┼─────────────────────────────────────────────────┘
            │  Returns: { available, ilp, pgwire }
            │
┌───────────▼─────────────────────────────────────────────────┐
│  Node-RED Instance (nr-launcher / device-agent)             │
│                                                             │
│  RED.settings.flowforge.timeseries.token ──► auto-discovery │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐│
│  │questdb-config│──│questdb-write │  │  questdb-query     ││
│  │  (ILP Sender │  │  (ILP ingest)│  │  (PGWire SQL)      ││
│  │  + PG Pool)  │  └──────────────┘  └────────────────────┘│
│  └──────┬───────┘                                           │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │  ILP (port 9000) + PGWire (port 8812)
          │
┌─────────▼───────────────────────────────────────────────────┐
│  QuestDB                                                    │
│  - ILP endpoint for high-throughput writes                   │
│  - PGWire endpoint for SQL queries                          │
│  - Web console at :9000 for debugging                       │
└─────────────────────────────────────────────────────────────┘
```

## Repositories and Branches

### 1. `FlowFuse/nr-questdb` — Branch: `main`

**The Node-RED node package.** This is the primary deliverable — a set of three nodes that can be installed in any Node-RED instance.

**Commits:**
| Commit | Description |
|--------|-------------|
| `5914aec` | Initial package: config, write, and query nodes |
| `6d242f0` | Fix crash on empty rows, improve batch write defaults |
| `a4f5805` | Add FlowFuse auto-discovery for QuestDB config |
| `ce6f895` | Add timestamp column type, dynamic columns, improve logging |

**Nodes:**

- **`questdb-config`** — Shared config node. Manages an ILP Sender (`@questdb/nodejs-client`) for writes and a PG Pool (`pg`) for queries. When running on FlowFuse (`RED.settings.flowforge.timeseries.token` is present), it calls `GET /api/v1/timeseries/config` to auto-discover QuestDB connection details. Falls back to manual configuration otherwise.

- **`questdb-write`** — Writes records via ILP protocol. Supports static column definitions (configured in the editor) or dynamic columns (`msg.columns`). Column types: `symbol`, `float`, `int`, `string`, `boolean`, `timestamp`. Supports batch writes (array in `msg.payload`), designated timestamps, and optional flush-after-write.

- **`questdb-query`** — Executes SQL queries via PGWire. Supports Mustache templates (`{{msg.topic}}`), parameterized queries (`msg.params`), and split output mode (one message per row or per N rows, with `msg.parts` for join/sort).

- **`utils/ff-api.js`** — Fetch wrapper for FlowFuse auto-discovery: calls `GET /api/v1/timeseries/config` with Bearer token.

**Dependencies:** `@questdb/nodejs-client` ^4.2.0, `mustache` ^4.2.0, `pg` ^8.11.3

### 2. `FlowFuse/flowfuse` — Branch: `feature/questdb-timeseries`

**Platform-side integration.** Serves QuestDB config to authenticated instances/devices, gated by team-type feature flags.

**Commits (8 total, net result after refactoring):**

The branch went through an evolution — initially a full Fastify plugin with schema management, service layer, metrics collector, and API routes (`8047e26d0` through `923b3db0b`). This was then refactored down to a lightweight config endpoint (`fbba618a5`), since the Node-RED nodes handle connections directly and don't need a platform-side service layer.

**Final state (3 files changed from main):**

| File | Change |
|------|--------|
| `forge/routes/api/timeseries.js` | Config endpoint: `GET /api/v1/timeseries/config`. Auth via project/device session tokens. Checks team-type feature flag. Returns QuestDB connection details from `flowforge.yml`. |
| `forge/lib/features.js` | Registers `timeseries` as a team-type feature (label: "Time-Series Database"). |
| `etc/flowforge.yml` | Adds commented `timeseries:` config section with QuestDB ILP and PGWire defaults. |

**How the config endpoint works:**

1. Request arrives with a project or device Bearer token (same token pattern used by Tables).
2. `preHandler` checks if `timeseries` feature is globally enabled in config.
3. Resolves the owning team from the project/device session.
4. Checks if the team's team-type has `timeseries` enabled.
5. If all checks pass, returns QuestDB connection config from `flowforge.yml`.
6. If any check fails, returns `{ available: false }`.

### 3. `FlowFuse/nr-launcher` — Branch: `feature/questdb-timeseries`

**Token injection for cloud/hosted instances.** One commit that injects the timeseries token into Node-RED's runtime settings, following the same pattern as the Tables feature.

**Commit:** `08d2260` — `feat: inject timeseries token into Node-RED settings`

**Change in `lib/runtimeSettings.js`:**
```javascript
// Existing tables token injection (for reference):
${settings.features?.tables ? `tables: {token: '${settings.projectToken}'},` : ''}
// New timeseries token injection (same pattern):
${settings.features?.timeseries ? `timeseries: {token: '${settings.projectToken}'},` : ''}
```

This makes `RED.settings.flowforge.timeseries.token` available to the `questdb-config` node for auto-discovery.

### 4. `FlowFuse/device-agent` — Branch: `feature/questdb-timeseries`

**Token injection for devices.** Same purpose as nr-launcher but for devices running via the device agent.

**Commit:** `f2627eb` — `feat: inject timeseries token into Node-RED settings`

**Change in `lib/launcher.js`:**
```javascript
const timeseriesEnabled = this.settings?.features
    ? this.settings.features.timeseries : false
if (timeseriesEnabled) {
    settings.flowforge.timeseries = {
        token: this.config.token
    }
}
```

This follows the same pattern as the existing `tables` token injection in the same file.

### 5. `FlowFuse/docker-compose` — Branch: `feature/questdb-timeseries`

**Docker Compose deployment for self-hosted.** Adds QuestDB as an optional service.

**Commits:**
| Commit | Description |
|--------|-------------|
| `013aa9d` | Add QuestDB service to Docker Compose |
| `2f240d9` | Bump QuestDB image to 9.0.1 for ILP v3 protocol support |

**Changes:**
- Adds `questdb` service (image `questdb/questdb:9.0.1`) with health check, ports 9000/8812/9009, and persistent volume.
- Uses `profiles: [timeseries]` so QuestDB is opt-in — default `docker compose up` is unchanged.
- Adds `timeseries:` config block to the forge service config, controlled by `TIMESERIES_ENABLED` env var.
- Adds `questdb-data` named volume.

**To enable:** `docker compose --profile timeseries up` with `TIMESERIES_ENABLED=true`.

## How It All Fits Together

### FlowFuse-Managed (Cloud or Self-Hosted Docker)

1. Admin enables `timeseries` in `flowforge.yml` (or `TIMESERIES_ENABLED=true` in Docker).
2. Admin enables the "Time-Series Database" feature on the relevant team type(s).
3. When a Node-RED instance starts, nr-launcher (or device-agent) checks `settings.features.timeseries` and injects `flowforge.timeseries.token` into Node-RED settings.
4. User adds `questdb-write` or `questdb-query` nodes to their flow. The `questdb-config` node detects the FlowFuse token and calls `GET /api/v1/timeseries/config` to get connection details automatically.
5. No manual host/port/credentials configuration needed per instance.

### Standalone (No FlowFuse)

1. User installs `@flowfuse/nr-questdb` from npm.
2. User adds a `questdb-config` node and manually enters ILP host/port and PGWire credentials.
3. Everything works the same, just without auto-discovery.

## Testing (Local Dev Environment)

The integration has been tested end-to-end in the local dev environment:

1. QuestDB running via Docker (port 9000 for ILP, 8812 for PGWire).
2. FlowFuse platform with `timeseries.enabled: true` in `flowforge.local.yml`.
3. Node-RED instances auto-configuring via the FlowFuse API.
4. Write and query operations confirmed working through the Node-RED editor.

**Config used in `flowforge.local.yml`:**
```yaml
timeseries:
  enabled: true
  questdb:
    ilp:
      protocol: http
      host: localhost
      port: 9000
    pgwire:
      host: localhost
      port: 8812
      user: admin
      password: quest
      database: qdb
```

## Remaining Work

### To Complete This Feature

1. **PRs for all repos** — Each branch needs a PR opened and reviewed:
   - `FlowFuse/flowfuse` `feature/questdb-timeseries` → `main`
   - `FlowFuse/nr-launcher` `feature/questdb-timeseries` → `main`
   - `FlowFuse/docker-compose` `feature/questdb-timeseries` → `main`
   - `FlowFuse/device-agent` `feature/questdb-timeseries` → `main`

2. **Unit tests** — The flowfuse branch had tests that were removed during the refactor to a lightweight endpoint. The config endpoint (`forge/routes/api/timeseries.js`) should have route-level tests covering:
   - Returns `{ available: false }` when feature is disabled globally.
   - Returns `{ available: false }` when team type doesn't have the feature.
   - Returns config when all checks pass.
   - Rejects unauthenticated requests.

3. **nr-questdb tests** — The package has a Vitest setup but tests need to be written for the config, write, and query nodes.

4. **npm publish** — `@flowfuse/nr-questdb` needs to be published to npm (or the FlowFuse npm registry) so it can be installed in Node-RED instances.

5. **Documentation** — User-facing docs for enabling timeseries, configuring team types, and using the Node-RED nodes.

### Out of Scope — Cloud Deployment and Instancing

The current work covers the **application-level integration**: how Node-RED talks to QuestDB and how FlowFuse serves the configuration. It does **not** cover the **infrastructure-level deployment** of QuestDB in FlowFuse Cloud.

For FlowFuse Cloud, QuestDB needs deployment and instancing logic similar to what exists for PostgreSQL (used by the Tables feature). This would involve:

- Provisioning QuestDB instances (shared or per-team, TBD).
- Lifecycle management (creation, scaling, backup, teardown).
- Integration with the FlowFuse Cloud infrastructure (Kubernetes operators, Helm charts, etc.).
- Connection routing and credential management at the infrastructure level.

**This is a separate workstream** that should be investigated to determine the right approach — it could follow the PostgreSQL pattern or take a different path depending on QuestDB's operational characteristics (single-node vs. clustered, resource isolation, multi-tenancy). This work would likely fall to **Ben or Piotr** given their infrastructure expertise.

The Docker Compose setup in `FlowFuse/docker-compose` provides a reference for self-hosted deployments but is not representative of what a cloud deployment would look like.
