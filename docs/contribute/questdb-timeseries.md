---
navTitle: Time-series databases
meta:
   description: How the per-team QuestDB time-series feature is built. Module layout, the driver interface, the state machine, PgBouncer sync, reconcile, team hooks and how to test it.
   tags:
      - flowfuse
      - development
      - contributing
      - timeseries
      - questdb
---

# Time-series databases

This page is for people changing the time-series code in the platform. For what the feature does, see [Time-Series Database](../user/timeseries.md). For running it, see [Time-series databases](../install/timeseries.md).

Each team has at most one time-series database, stored in the `TimeseriesDatabase` table. It is one of two kinds:

- `managed`: a driver creates a QuestDB server for the team and the platform looks after it.
- `external`: the team owner entered the details of a server they run. The row is all there is. A driver is never called for it.

Node-RED instances and devices read the details from `GET /api/v1/timeseries/config`. The Node-RED nodes are in a separate package, `@flowfuse/nr-questdb`, which is private while it is in development.

## Module layout

```text
forge/ee/lib/timeseries/
  index.js              init(app): registers the feature, ensures timeseriesSecret, loads the driver,
                        installs the team hooks
  wrapper.js            Timeseries class: state machine, background tasks, PgBouncer sync, reconcile,
                        backups, connection details per audience
  credentials.js        slug and credential generation, the timeseriesSecret setting
  connection.js         validation of external server input, and the payloads the config endpoint returns
  connectionCheck.js    ILP /ping and PGWire SELECT 1 against external servers, with address rules
  pgbouncer.js          renders and writes PgBouncer's team list
  snapshots.js          retention rules for volume snapshots
  drivers/
    static.js           one shared server from flowforge.yml
    stub.js             in-memory, for tests
    docker.js           Docker Compose
    kubernetes.js       Kubernetes
    kubernetesResources.js  pure builders for the Kubernetes objects
forge/ee/db/models/TimeseriesDatabase.js
forge/ee/db/views/TimeseriesDatabase.js
forge/ee/routes/timeseries/index.js      team routes
forge/ee/routes/timeseries/config.js     /api/v1/timeseries/config
forge/housekeeper/tasks/timeseriesBackup.js
forge/db/migrations/20261118-01-EE-add-timeseries-databases.js
```

The module is loaded when `timeseries.enabled` is set. `forge/ee/lib/index.js` decorates the app with `app.timeseries`, and `forge/ee/routes/index.js` registers the routes. It follows the same shape as `forge/ee/lib/tables`.

Related changes outside the module:

1. `forge/lib/features.js` registers the `timeseries` team type feature.
2. `forge/lib/permissions.js` has the `team:timeseries:*` permissions.
3. `forge/auditLog/team.js` has the `team.timeseries.*` events.
4. `forge/db/models/Team.js` refuses to delete a team that owns a managed server.
5. `forge/routes/api/project.js` and `forge/routes/api/deviceLive.js` pass the `timeseries` flag to the launcher and the device agent, which inject the token the nodes use.

## Data model

`TimeseriesDatabase` has a unique `TeamId`, so the database enforces one per team.

| Column | Notes |
|--------|-------|
| `name` | Display name |
| `kind` | `managed` or `external` |
| `state` | See [States](#states) |
| `stateDetail` | Progress message, error text, or the reason a server is suspended |
| `tier` | Key into `driver.options.tiers`. Managed only |
| `image` | The image the server runs, so upgrades are tracked per team. Managed only |
| `endpoints` | JSON. Managed: `{ internal: { host, httpPort, pgPort }, external: { host, httpProtocol, httpPort } }`. External: `{ ilp, pgwire }` as entered, without credentials |
| `credentials` | The whole credentials object as one encrypted string, read and written only through `getCredentials()` and `setCredentials()` |
| `meta` | JSON. `slug`, plus driver data such as the container id |

Credentials are encrypted with the `timeseriesSecret` platform setting, which is generated on first start.

A managed server's identity is its slug, a random 12 character lowercase name. It names the Docker container and volume, the Kubernetes objects (`ts-<slug>`), the public host name and the PgBouncer database. Team hashids are mixed case, so they cannot be used where names are case-insensitive. Managed credentials use the user name `t_<slug>` for both HTTP and PGWire. PgBouncer does not tie users to databases, so a unique user name per server is what keeps a team out of another team's server.

## Driver interface

A driver is a module that exports functions. The wrapper only calls the ones a driver has, and `canManage` is true when it has `create`. The `static` driver has only `shared`, `init`, `shutdown` and `sharedConnection`, so it serves one shared server and manages nothing.

| Member | Required | Description |
|--------|----------|-------------|
| `init(app, options, config)` | Yes | Connect to Docker or the Kubernetes API. `options` is `timeseries.driver.options` and `config` is the whole `timeseries` section |
| `shutdown()` | No | Release anything `init` opened |
| `shared` | Static only | `true` when one server serves every team |
| `sharedConnection(audience)` | Static only | Connection details for `internal` or `external` callers |
| `create(team, database, { credentials, tier })` | For managed servers | Create the resources, wait until the server is healthy, and return `{ endpoints, meta }`. Roll back everything on failure |
| `remove(team, database)` | For managed servers | Delete the resources, including the volume |
| `suspend(team, database)` | No | Stop the server and keep the volume |
| `resume(team, database)` | No | Start it again and wait until it is healthy |
| `resize(team, database, tier, previousTier)` | No | Apply a new tier. Kubernetes grows the volume and replaces CPU and memory, and refuses to shrink. Docker updates CPU and memory |
| `rotateCredentials(team, database, credentials)` | No | Make the server use new credentials. Kubernetes replaces the Secret and restarts the pod. Docker recreates the container on the same volume |
| `upgrade(team, database, image)` | No | Move the server to another image on the same data |
| `status(team, database)` | No | `running`, `stopped`, `starting` or `missing`. Used by reconcile |
| `list()` | No | Slugs of every server the driver has created, whether or not there is a row. Used to log orphans |
| `writePgbouncer(files)` | No | Publish PgBouncer's team list. Docker writes into `pgbouncer.configDir`. Kubernetes replaces the `pgbouncer.secretName` Secret |
| `backup(team, database, credentials)` | No | Take a snapshot. Returns its name. Kubernetes only |
| `listSnapshots(team, database)` | With `backup` | Snapshots as `{ name, createdAt }`, for retention |
| `deleteSnapshot(team, database, name)` | With `backup` | Remove one snapshot |

`wrapper.js` raises `not_supported` when a route needs a method the driver lacks. A driver that is added needs `create`, `remove` and, in practice, `status`, `suspend`, `resume`, `resize`, `rotateCredentials` and `writePgbouncer`.

## States

```text
          create                 healthy
 (none) ─────────► provisioning ─────────► ready ◄────────┐
                        │                   │  │          │ resume
                        │ failure           │  │ suspend  │
                        ▼                   │  ▼          │
                      error ◄───────────────┘ suspended ──┘

 delete (any managed state) ─► deleting ─► row removed
```

An external database is created in `ready` and has no other state. Deleting it removes the row.

`stateDetail` carries the following values.

| State | `stateDetail` |
|-------|---------------|
| `provisioning` | `null` after create, `Resizing from <tier> to <tier>`, `Rotating credentials`, `Upgrading to <image>`, `Resuming` (after a trial) or `Recreating after restart` (reconcile) |
| `ready` | `null` |
| `error` | The error message of the operation that failed, or `Delete failed: <message>` |
| `suspended` | The reason: `team_suspended`, `trial_ended` or `feature_disabled` |
| `deleting` | `null` |

An operation that fails leaves the row in `error` and does not undo itself, apart from `create`, which rolls back what it made. There is no retry route. The owner deletes the database and creates it again.

Only a `ready` managed server can be resized, rotated or upgraded. Anything else raises `not_ready`.

## Background tasks

Routes return straight away. Every driver call for create, resize, rotate, delete, resume and upgrade runs in the background, which the wrapper starts with `background(fn)`. It waits one tick first, so the response always describes the state before the operation. The UI or the caller polls `GET /`.

Every background promise is added to a set by `track()`, which logs and swallows errors. `settle()` waits until the set is empty and then waits for the PgBouncer queue. `shutdown()` calls `settle()` before it shuts the driver down, and tests call it to wait for an operation to finish.

## PgBouncer sync

`syncPgbouncer()` rewrites PgBouncer's team list from `TimeseriesDatabase.readyManaged()`. It is called whenever the set of ready managed servers or one of their credentials changes: after provisioning, resize, rotation, resume, upgrade and delete, on suspend, and at the end of reconcile.

Calls go through a promise queue, `pgbouncerQueue`, so two writes never overlap. A failed sync is logged and does not stop the queue. `pgbouncer.render()` produces `databases.ini` and `userlist.txt` in a stable order, so an unchanged list produces identical files and PgBouncer does not reload. It refuses names, hosts or ports that could break out of a line, and a user name that two servers share. It never writes `user=` or `password=` into `databases.ini`, because a forced user would let any authenticated client reach any team's server.

Nothing happens when the driver has no `writePgbouncer` or the config has no `pgbouncer` section.

## Reconcile

`reconcile()` runs in the background from `init()`. For managed servers it:

1. Provisions again any row left in `provisioning`, and deletes again any row left in `deleting`.
2. Sets a `ready` row back to `provisioning` and creates it again when the driver reports the server `missing`.
3. Runs `syncFeature()` for every team, so a team that lost the feature while the platform was down gets its server suspended.
4. Logs servers the driver lists that have no row (`has no database row, leaving it in place`). Orphans are never deleted, because the volume may hold customer data.
5. Rewrites the PgBouncer team list.

## Team hooks

`index.js` wraps three methods on `Team.prototype` when the driver can manage servers. A failure in a hook is logged and never fails the team operation.

| Method | Hook |
|--------|------|
| `suspend` | `suspendTeam(team, 'team_suspended')` |
| `unsuspend` | `resumeTeam(team, 'team_suspended')` |
| `updateTeamType` | `syncFeature(team)`: suspends with `feature_disabled` if the new type lacks the feature, resumes a `feature_disabled` server if it has it |

The trial task in `forge/ee/lib/billing/trialTask.js` calls `suspendTeam(team, 'trial_ended')` when a trial ends without billing.

`suspendTeam` stops a `ready` managed server, records the reason in `stateDetail`, updates PgBouncer and writes an audit entry. `resumeTeam(team, reason)` starts a `suspended` server and does nothing if the stored reason differs from `reason`, so an event can only undo its own suspension. If the team type has lost the feature in the meantime, it keeps the server suspended with `feature_disabled` instead.

A server suspended for `trial_ended` is not resumed by an event. The owner calls `POST /:id/resume`, which runs `resumeAfterTrial()`, and the route refuses while the team is suspended.

`Team.beforeDestroy` refuses to delete a team that owns a managed server. It looks the model up on the team's own Sequelize instance, because EE models are not in the core model registry.

## Backups

`forge/housekeeper/tasks/timeseriesBackup.js` runs nightly at a random time between 01:00 and 03:59 and calls `backupAll()` when `snapshots.enabled` is set and the driver has `backup`. For every ready managed server it calls `driver.backup()`, lists the snapshots, and deletes the ones `snapshotsToDelete()` selects. A failure for one server is logged and the others carry on.

## External servers

`connection.js` validates every field, because the values end up in Node-RED settings on instances and devices. `connectionCheck.js` connects to hosts a team owner typed in, so it resolves the host first and refuses private, loopback, link-local, CGNAT, multicast, reserved and IPv4-mapped addresses unless `timeseries.external.allowPrivateNetworks` is set. It then connects to the address it checked. Errors are reduced to a short code. Do not return raw errors from it.

## Running the tests

Unit tests need no external services:

```bash
npx mocha test/unit/forge/ee/lib/timeseries/*_spec.js \
  test/unit/forge/ee/routes/timeseries/index_spec.js \
  --require test/lib/fast-bcrypt.js --require test/lib/fastify-schema-cache.js --timeout 10000
```

The route tests use the `stub` driver and call `app.timeseries.settle()` to wait for background work. The Kubernetes builders are tested as pure functions, so no cluster is needed.

The Docker driver has an integration test that runs against the local Docker daemon. It is skipped unless you ask for it, and it pulls a QuestDB image:

```bash
TIMESERIES_DOCKER_TEST=1 npx mocha test/unit/forge/ee/lib/timeseries/docker_spec.js --timeout 120000
```

The following checks are not automated. Run them by hand when you change a driver, the Helm chart or the Compose file:

1. **kind:** install the Helm chart with `forge.timeseries.enabled`, create a team server, and check write and query from an instance, then from a device through PgBouncer. Check the Ingress answers only `/write`, `/api/v2/write` and `/ping`. Rotate, resize, suspend, upgrade and delete. Check that the NetworkPolicy blocks a pod in another namespace.
2. **Docker Compose:** start the stack with `--profile timeseries`, and make the same checks through nginx-proxy and PgBouncer, including that other paths return `404`.
3. **PgBouncer:** a new team and rotated credentials become reachable after the reload delay, and a team cannot open another team's database.
4. **Snapshots:** they need a cluster with a CSI snapshot driver. kind has none, so the task can only be checked up to the snapshot request there.
