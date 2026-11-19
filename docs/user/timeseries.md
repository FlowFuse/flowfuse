---
navTitle: Time-Series Database
meta:
   description: Give a team its own QuestDB time-series database, or connect a QuestDB server you run yourself, and read and write it from Node-RED instances and devices.
   tags:
      - timeseries
      - questdb
      - database
      - nodered
---

# Time-Series Database

::warning
This feature is in development. It is only available to Enterprise teams, and only when the platform administrator has enabled it.
::

A team can have one time-series database. It is a [QuestDB](https://questdb.io/) server that stores timestamped data such as sensor readings and metrics, and answers SQL queries about it.

QuestDB speaks two protocols, and FlowFuse uses each for one job:

- **Writes** use InfluxDB Line Protocol (ILP) over HTTP.
- **Queries** use the PostgreSQL wire protocol (PGWire), so any PostgreSQL client can run SQL against the database.

The team has one of two kinds of database:

- **Managed**: FlowFuse runs a dedicated QuestDB server for the team and looks after it.
- **External**: you run a QuestDB server yourself and tell FlowFuse how to reach it. FlowFuse stores the connection details and gives them to the team's instances and devices. It does not run, back up or proxy the server.

A team cannot have both. The database is not shared with other teams.

## Before you start

The team's type must include the **Time-Series Database** feature, which a platform administrator turns on for each team type. Without it every request to the endpoints on this page returns `404`.

You manage the database through the FlowFuse API, using a [personal access token](./http-access-tokens.md) of a team owner. All endpoints are under `/api/v1/teams/<team id>/timeseries`. They are listed in [API endpoints](#api-endpoints).

## Creating a managed server

Send a `POST` to the endpoint with an optional name and tier:

```bash
curl -X POST https://forge.example.com/api/v1/teams/<team id>/timeseries \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{ "name": "Factory data", "tier": "small" }'
```

The response is `202`. The server is created in the background and its `state` is `provisioning` until it is ready, which usually takes from a few seconds to a few minutes, depending on whether the platform has to pull the QuestDB image. Poll `GET /api/v1/teams/<team id>/timeseries` until the state is `ready`. If creation fails, the state is `error` and `stateDetail` says why. Delete the database and create it again.

The tiers come from the platform. Each tier sets the CPU, memory and, on Kubernetes, disk size of the server. `GET /api/v1/teams/<team id>/timeseries` lists the available tiers and the default in its `platform` section. If you leave `tier` out, the platform's default tier is used.

A managed database is private to its team and always uses a username and password that FlowFuse generates. The username is unique to the database.

## Connecting your own server

If your team already runs QuestDB (the open source edition, QuestDB Enterprise or QuestDB Cloud), connect it instead of creating a managed server. The platform administrator can disable this option, in which case the request is refused with `not_supported`.

Send a `POST` with `kind` set to `external` and the details of both protocols:

```bash
curl -X POST https://forge.example.com/api/v1/teams/<team id>/timeseries \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "kind": "external",
       "name": "Our QuestDB",
       "ilp": {
         "protocol": "https",
         "host": "questdb.example.com",
         "port": 443,
         "authType": "basic",
         "username": "writer",
         "password": "<password>"
       },
       "pgwire": {
         "host": "questdb.example.com",
         "port": 8812,
         "database": "qdb",
         "user": "reader",
         "password": "<password>",
         "ssl": true
       }
     }'
```

### Details needed

For ILP over HTTP (`ilp`):

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `protocol` | Yes | | `http` or `https` |
| `host` | Yes | | Host name or address |
| `port` | No | `9000` | |
| `authType` | No | `none` | `none`, `basic` or `bearer` |
| `username`, `password` | With `basic` | | `username` is required for `basic` |
| `token` | With `bearer` | | |
| `tlsVerify` | No | `true` | Set to `false` only for testing |
| `tlsCa` | No | | PEM text of a private certificate authority |
| `protocolVersion` | No | `auto` | `auto`, `1` or `2` |

For PGWire (`pgwire`):

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `host` | Yes | | Host name or address |
| `user` | Yes | | |
| `password` | No | | |
| `port` | No | `8812` | |
| `database` | No | `qdb` | |
| `ssl` | No | `false` | Use TLS for the connection |
| `sslVerify` | No | `true` | Set to `false` only for testing |
| `ca` | No | | PEM text of a private certificate authority |

The passwords and tokens are stored encrypted.

QuestDB's open source edition has no TLS of its own. A server that devices reach over the internet needs a TLS proxy in front of its HTTP port and a PostgreSQL-aware TLS terminator, such as PgBouncer, in front of its PGWire port. FlowFuse does not provide these for external servers.

### The connection check

When you save an external server, FlowFuse connects to it once over ILP (`GET /ping`) and once over PGWire (`SELECT 1`) and returns the result next to the saved database:

```json
{
  "database": { "id": "...", "kind": "external", "state": "ready" },
  "check": {
    "ilp": { "ok": true },
    "pgwire": { "ok": false, "error": "authentication_failed" }
  }
}
```

Saving succeeds even when the check fails, because the platform may not be able to reach a server that your instances and devices can reach, for example one on a private network. Send `"check": false` to skip the check.

To try the details without saving them, send the same `ilp` and `pgwire` objects to `POST /api/v1/teams/<team id>/timeseries/check`. This endpoint is limited to 10 requests a minute when rate limiting is on.

A failed check reports one of these codes for each protocol:

| Code | Meaning |
|------|---------|
| `not_configured` | No host was given for this protocol |
| `host_not_found` | The host name did not resolve |
| `private_address_not_allowed` | The host resolves to a private, loopback, link-local or otherwise reserved address, and the platform does not allow checks against those |
| `connection_refused` | Nothing is listening on that host and port |
| `timeout` | The server did not answer within 5 seconds |
| `authentication_failed` | The server rejected the credentials |
| `tls_error` | The TLS handshake or certificate verification failed |
| `unexpected_response` | The ILP endpoint answered `/ping` with something other than success |
| `connection_failed` | Any other failure |

`private_address_not_allowed` protects the platform from being used to probe its own network. On a self-hosted platform, the administrator can allow private addresses. See [Time-series databases](../install/timeseries.md#external-servers).

You can change the connection details or the name later with `PUT /api/v1/teams/<team id>/timeseries/<id>`, and disconnect the server with `DELETE`. Disconnecting only removes the saved details. Your server and its data are not touched.

## What instances and devices get

Node-RED instances and devices find the database automatically. Their token is used to ask the platform for the details of the team's database. Only instance and device tokens get an answer. A browser session or a personal access token does not receive the credentials this way.

For a managed database the answer depends on where Node-RED runs:

| | Writes (ILP over HTTP) | Queries (PGWire) |
|---|------------------------|------------------|
| Hosted instances | Directly to the server on the platform's internal network | Directly to the server on the platform's internal network |
| Devices | Over HTTPS to the database's public host name, `<random name>.ts.<platform domain>` | Over TLS through a shared PgBouncer, which picks your team's server by database name |

Devices never receive the internal addresses. An external database gives the same details to instances and devices, exactly as you entered them.

While the database is not `ready`, instances and devices are told it is unavailable, together with its state. The Node-RED nodes wait and ask again.

## Using it from Node-RED

The QuestDB nodes, `@flowfuse/nr-questdb`, read the details from the platform with no configuration. Add a **questdb-config** node, leave its fields at their defaults, and wire write and query nodes to it. The nodes are a private package while they are in development. See the package README for how to install them.

The nodes work with the manual settings in the config node as well, in plain Node-RED with no FlowFuse involved.

## Credential rotation

Rotate the password of a managed database from the API:

```bash
curl -X POST https://forge.example.com/api/v1/teams/<team id>/timeseries/<id>/rotate-credentials \
     -H "Authorization: Bearer <token>"
```

The response is `202`. The server restarts with new passwords, which takes it offline for a short time, and the state goes to `provisioning` and back to `ready`. The data is kept.

What clients see:

1. Writes and queries that use the old password are rejected. The QuestDB nodes fetch the details again when the server rejects their password and retry once, so a running flow recovers on its own. Rows that were buffered but not yet sent when the old password was rejected are lost, so turn on **Flush after write** on the write node if you cannot accept that.
2. Devices query through PgBouncer, which learns the new password after a delay. This takes a few seconds. Until then, devices cannot query the database.
3. Hosted instances do not use PgBouncer, so they recover as soon as the server is back.

Rotation does not apply to external databases. Change the password on your own server, then update the saved details with `PUT`.

## Resizing

Change the tier with `PUT /api/v1/teams/<team id>/timeseries/<id>` and a body of `{ "tier": "medium" }`. The response is `202` and the state is `provisioning` while the change is applied.

- On Kubernetes, the server restarts to apply the new CPU and memory, which takes it offline for between half a minute and two minutes. Writes in that window fail, so flows must retry or buffer. The disk can only grow. A tier with a smaller disk is refused and the state becomes `error` with the reason in `stateDetail`.
- On Docker, the CPU and memory limits change in place. The disk is the host's disk and has no per-team size.

## Suspended databases

The platform stops a managed server, and keeps its data, in three cases:

| `stateDetail` | Cause | How it resumes |
|---------------|-------|----------------|
| `team_suspended` | The team is suspended | Automatically when the team is unsuspended |
| `trial_ended` | The team's trial ended without billing being set up | A team owner resumes it with `POST /api/v1/teams/<team id>/timeseries/<id>/resume`, once the team is no longer suspended |
| `feature_disabled` | The team's type no longer includes the Time-Series Database feature | Automatically when the team moves to a type that includes it again |

While a database is `suspended`, its instances and devices are told it is unavailable and the nodes wait. A server is only resumed by the event that matches the reason it was suspended. For example, unsuspending a team does not start a server that was suspended because the team's type lost the feature.

When a team's type does not include the feature, the endpoints on this page answer `404`. The team's owners cannot see or delete the stopped server until the feature is back.

## Deleting

Delete a managed database with `DELETE /api/v1/teams/<team id>/timeseries/<id>`. The response is `202`, and the server is removed in the background, including its disk. There is no undo.

A team cannot be deleted while it has a managed database. Delete the database first. An external database is only a saved set of details, so it does not block team deletion.

## Limits

1. Only `/write`, `/api/v2/write` and `/ping` are reachable on a managed database's public host name. The QuestDB web console and SQL over HTTP (`/exec`) are not available from outside the platform. Run SQL through PGWire, from a Node-RED query node or any PostgreSQL client.
2. ILP over TCP is turned off. Writes use ILP over HTTP.
3. A team has one database.
4. QuestDB's open source edition has one user for HTTP and one for PGWire. Every instance and device in the team uses the same credentials, so the team is the boundary of access.

## Keeping the disk from filling

Time-series data grows without limit unless you remove it. Give each table a time-to-live (TTL), and QuestDB drops partitions older than that on its own:

```sql
ALTER TABLE sensor_readings SET TTL 30 DAYS;
```

The table must be partitioned by time, for example `PARTITION BY DAY`, and TTL is applied to whole partitions. See the [QuestDB documentation](https://questdb.io/docs/) for the syntax and the units it accepts.

When the disk of a managed server fills up:

1. Writes fail with HTTP `500` and an error mentioning `No space left`. Queries keep working.
2. QuestDB stays up and still reports itself healthy, so the database's state in FlowFuse remains `ready`.
3. Data that was acknowledged before the disk filled is not lost, but QuestDB may stop making it visible to queries until space is freed and the table is resumed.

To recover, free space first, then resume the tables. Connect with a PostgreSQL client using the connection details from `GET /api/v1/teams/<team id>/timeseries/<id>` and drop old data with `ALTER TABLE ... DROP PARTITION` or `DROP TABLE`. Then run `ALTER TABLE <table> RESUME WAL` on every table that QuestDB suspended. Writes do not resume by themselves, and restarting the server does not help. Resuming needs free space of the same order as the largest partitions being merged, so a table that is nearly full may suspend again. The platform administrator can add disk space or help with recovery. The administrator's steps are in [Time-series databases](../install/timeseries.md#when-the-disk-is-full).

## API endpoints

All endpoints are under `/api/v1/teams/<team id>/timeseries`. Team members can read. Team owners can change things. Platform administrators can also upgrade a server's image.

| Method and path | Who | Purpose |
|-----------------|-----|---------|
| `GET /` | Member | The team's database, and what the platform supports (tiers, whether managed and external are available) |
| `POST /` | Owner | Create a managed server, or connect an external one with `kind: "external"` |
| `POST /check` | Owner | Check external server details without saving them |
| `GET /<id>` | Member | The database. Owners also get the connection details a device would use, credentials included, once the database is ready |
| `PUT /<id>` | Owner | Change the tier of a managed server, or the name and connection details of an external one |
| `POST /<id>/rotate-credentials` | Owner | New passwords for a managed server |
| `POST /<id>/resume` | Owner | Start a server that was suspended when a trial ended |
| `POST /<id>/upgrade` | Platform administrator | Move a managed server to another image. See [Time-series databases](../install/timeseries.md#upgrading-the-questdb-image) |
| `DELETE /<id>` | Owner | Delete a managed server and its data, or disconnect an external one |

Creating, resizing, rotating, resuming and deleting a managed server return straight away with `202` and finish in the background. Poll `GET /` to follow the `state`.

The states are `provisioning`, `ready`, `error`, `suspended` and `deleting`.

Errors carry a `code`. The common ones are `invalid_tier`, `invalid_request` (a field failed validation), `not_supported` (the platform does not offer this), `already_exists` (the team already has a database), `not_ready` (the database is not in the `ready` state) and `not_resumable`.
