---
navTitle: Time-series databases
meta:
   description: Enable per-team QuestDB time-series databases on a self-hosted FlowFuse platform with Docker or Kubernetes. Configure drivers, PgBouncer, external servers, backups and disk-full recovery.
   tags:
      - timeseries
      - questdb
      - docker
      - kubernetes
      - pgbouncer
      - backup
---

# Time-series databases

::warning
This feature is in development and requires an Enterprise licence.
::

FlowFuse can give each team its own [QuestDB](https://questdb.io/) server for time-series data. Node-RED instances and devices in the team find it automatically. See [Time-Series Database](../user/timeseries.md) for what team members see.

This page is for the platform administrator. It covers enabling the feature, the three drivers, every setting, the prerequisites for Docker and Kubernetes, upgrades, backups and what to do when a disk fills up.

## How it works

1. A team owner asks for a database through the API. FlowFuse creates one QuestDB server for that team, with a volume of its own and a generated user name and password.
2. Hosted instances reach the server on the platform's internal network.
3. Devices write over HTTPS to a public host name, `<random name>.ts.<domain>`, which only lets the ILP write paths and `/ping` through. They query over PGWire through a shared PgBouncer, which terminates TLS and picks the team's server from the database name.
4. Team owners can instead connect a QuestDB server that they run. FlowFuse stores the details and never touches that server.

Each managed server costs a pod or container and a volume, so size the host or cluster for the number of teams that will use the feature.

## Enabling

1. Install an Enterprise licence. See [Licensing](../admin/licensing.md).
2. Set `timeseries.enabled: true` and choose a driver in `flowforge.yml`. On Docker Compose and Helm this is done with the variables and values described below.
3. Turn on the **Time-Series Database** feature for each team type that should have it. See [Team type features](../admin/introduction.md#team-type-features).
4. Restart the platform.

Without step 3 the feature stays off for every team.

## Drivers

The driver decides how teams get a server. Set it in `timeseries.driver.type`.

| Driver | Use it when | What a team gets |
|--------|-------------|------------------|
| `docker` | You run FlowFuse with Docker Compose | One container and one named volume per team |
| `kubernetes` | You run FlowFuse with the Helm chart | One Deployment, volume, Service and Ingress per team, in a dedicated namespace |
| `static` | You already run one QuestDB server and want every team to use it | The same server for every team, with no isolation between them |

Use `static` only when all teams trust each other. Every team receives the same credentials. A team owner can still connect an external server, which takes precedence over the shared one.

A `flowforge.yml` written before drivers existed, with a `timeseries.questdb` block and no `driver`, is read as the `static` driver.

## Configuration

```yaml
timeseries:
  enabled: true
  driver:
    type: kubernetes
    options:
      image: questdb/questdb:9.0.1
      domain: ts.example.com
      defaultTier: small
      tiers:
        small:
          cpu: '1'
          memory: 2Gi
          storage: 20Gi
        medium:
          cpu: '2'
          memory: 8Gi
          storage: 100Gi
      namespace: flowfuse-timeseries
  pgbouncer:
    host: ts.example.com
    port: 5432
    ssl: true
    secretName: timeseries-pgbouncer
  external:
    enabled: true
    allowPrivateNetworks: false
```

On Docker Compose and Helm, the platform's own configuration file is generated from variables or chart values, so you rarely edit this by hand. See the pages for [Docker](#docker) and [Kubernetes](#kubernetes).

### Top level

| Key | Default | Description |
|-----|---------|-------------|
| `timeseries.enabled` | `false` | Turns the feature on |
| `timeseries.driver.type` | | `docker`, `kubernetes` or `static` |
| `timeseries.driver.options` | | Settings for the driver, below |
| `timeseries.pgbouncer` | not set | How devices query managed servers, below. Without it devices get no query details and can only write |
| `timeseries.external.enabled` | `true` | Let team owners connect their own server |
| `timeseries.external.allowPrivateNetworks` | `false` | Let the connection check reach private addresses, below |

### Driver options for `docker` and `kubernetes`

| Key | Default | Description |
|-----|---------|-------------|
| `image` | none, required | QuestDB image, for example `questdb/questdb:9.0.1`. Used for new servers |
| `domain` | none, required | Parent domain for the public host names. A team's server is `<random name>.<domain>` |
| `tiers` | none | The sizes a team can pick, keyed by name. Each has `cpu` and `memory`. On Kubernetes it also has `storage`. Without tiers no managed server can be created |
| `defaultTier` | the first tier | Tier used when the team does not choose one |
| `readyTimeout` | `120000` on Docker, `300000` on Kubernetes | Milliseconds to wait for a new or restarted server before it is marked `error` |

Docker accepts memory as `2g`, `512m`, `2Gi` or a number of bytes. A Docker server's disk is the host's disk, so `storage` is ignored.

### Driver options for `docker` only

| Key | Default | Description |
|-----|---------|-------------|
| `socket` | the instance driver's socket, then `/var/run/docker.sock` | Docker socket |
| `network` | detected | Compose network the servers join. By default the network labelled `com.docker.compose.network=flowforge` is used |
| `letsencrypt` | not set | Ask the nginx-proxy companion for a certificate for each team host name |
| `tls` | the value of `letsencrypt` | Whether team host names are served over HTTPS. Decides the protocol and port devices are given: HTTPS on 443, or HTTP on 80 |
| `vhostDir` | `/etc/nginx/vhost.d` | nginx-proxy's `vhost.d` directory, shared with the platform container, where the per-team path restrictions are written |

### Driver options for `kubernetes` only

| Key | Default | Description |
|-----|---------|-------------|
| `namespace` | none, required | Namespace for the per-team servers |
| `storageClass` | the cluster default | StorageClass for each team's volume |
| `ingressClass` | not set | Ingress class for the team host names |
| `ingressAnnotations` | `{}` | Annotations added to each team's Ingress |
| `tlsSecretName` | not set | TLS Secret for the team host names, typically a wildcard certificate for `*.<domain>` |
| `nodeSelector` | not set | Node selector for the QuestDB pods |
| `tolerations` | not set | Tolerations for the QuestDB pods |
| `snapshots.enabled` | `false` | Take nightly volume snapshots, see [Backups](#backups) |
| `snapshots.volumeSnapshotClass` | the cluster default | VolumeSnapshotClass for the snapshots |
| `snapshots.timeout` | `300000` | Milliseconds to wait for a snapshot to be taken |
| `snapshots.retention.daily` | `7` | Newest snapshots to keep |
| `snapshots.retention.weekly` | `4` | Weeks to keep one older snapshot for |

Devices are always given `https` on port 443 for writes on Kubernetes, so the Ingress must terminate TLS.

### Driver options for `static`

`timeseries.driver.options.questdb` holds the one shared server:

| Key | Default |
|-----|---------|
| `ilp.protocol` | `http` |
| `ilp.host` | `localhost` |
| `ilp.port` | `9000` |
| `ilp.authType` | `none` (`basic` and `bearer` also work, with `username` and `password`, or `token`) |
| `ilp.tlsVerify` | `true` |
| `ilp.tlsCa` | not set |
| `ilp.protocolVersion` | `auto` |
| `pgwire.host` | `localhost` |
| `pgwire.port` | `8812` |
| `pgwire.user` | `admin` |
| `pgwire.password` | `quest` |
| `pgwire.database` | `qdb` |
| `pgwire.ssl` | `false` |
| `pgwire.sslVerify`, `pgwire.ca` | not set |
| `external.ilp`, `external.pgwire` | not set. Override the settings above for devices outside your network, for example a public host name with TLS |

Change the default `admin` password of the shared server before you use it.

### PgBouncer settings

| Key | Default | Description |
|-----|---------|-------------|
| `pgbouncer.host` | none | Host name devices connect to for queries |
| `pgbouncer.port` | `5432` | Port devices connect to |
| `pgbouncer.ssl` | `false` | Tell devices to use TLS. Set it when PgBouncer has a certificate |
| `pgbouncer.maxConnectionsPerTeam` | not set | Server connections one team's database may hold. When not set, PgBouncer's own default applies |
| `pgbouncer.configDir` | none | Docker only. Directory shared with the PgBouncer container where the team list is written |
| `pgbouncer.secretName` | none | Kubernetes only. Secret the PgBouncer pods mount, where the team list is written |
| `pgbouncer.podSelector` | `flowfuse.com/component=timeseries-pgbouncer` | Kubernetes only. Label selector for the PgBouncer pods the platform annotates after writing the team list |

## External servers

Team owners can connect a QuestDB server that FlowFuse does not manage. When they save one, the platform connects to the host they typed in, over ILP and PGWire, to check it works. That is a request made by the platform on a user's behalf, so by default it is restricted.

With `timeseries.external.allowPrivateNetworks` off, the connection check refuses any host that resolves to a loopback, private (RFC 1918), link-local (including the cloud metadata address), CGNAT, multicast or reserved address, or an IPv6 unique-local, link-local or IPv4-mapped address. The check connects to the address it verified, so a changing DNS answer cannot redirect it. Without this, anyone who can create a team could use the check to probe your internal network, which is a server-side request forgery risk.

Turn `allowPrivateNetworks` on only for a self-hosted platform where external servers sit on a private network and every team owner is trusted. On Docker Compose set `TIMESERIES_ALLOW_PRIVATE_NETWORKS=true`. In Helm set `forge.timeseries.external.allowPrivateNetworks`. Leave it off on any platform where teams belong to different customers.

To stop teams connecting their own servers, set `timeseries.external.enabled` to `false`.

## PgBouncer

QuestDB's open source edition has no TLS, and a proxy that routes by host name cannot front PGWire because the client asks for TLS before it sends a host name. FlowFuse therefore runs one shared PgBouncer for all managed servers. It does three things:

1. Terminates TLS for devices on one host name and port.
2. Chooses the team's server from the database name the device asks for. The database name is the team server's random name.
3. Caps connections to each team's server so one team cannot use up the pool.

The platform writes the list of teams to PgBouncer whenever a server becomes ready, is deleted, is suspended or resumed, or gets new credentials, and on startup. PgBouncer reloads the list by itself. The list holds each team's PGWire password in clear text, because QuestDB asks for the password in clear and PgBouncer has to pass it on. It lives in a Secret on Kubernetes and in a volume that only the platform and PgBouncer mount on Docker. External servers are never in it.

Each team has a different user name. PgBouncer authenticates the device against its list, then logs in to the requested team's server with the same user name and password, so a device asking for another team's database is refused by that server.

### TLS

1. On Docker, PgBouncer uses the certificate of the platform's own host name, from the same volume nginx-proxy uses. Devices connect to the platform host name on the PgBouncer port, so no extra DNS name or certificate is needed.
2. On Kubernetes, PgBouncer uses a `kubernetes.io/tls` Secret that you provide, for example one issued by cert-manager for `ts.<domain>`. Set it in `forge.timeseries.pgbouncer.tls.secretName`. A renewed certificate is picked up automatically.

If PgBouncer finds no certificate, it starts and accepts unencrypted connections and logs a warning. Use that for testing only.

### Reload delay

When a team's server is created, or its credentials are rotated, devices can't query it until PgBouncer has the new team list.

1. On Docker the delay is up to 5 seconds.
2. On Kubernetes it is a few seconds. The kubelet only refreshes a mounted Secret on its periodic sync, which can take over a minute, so the platform annotates the PgBouncer pods after each change to make the kubelet sync them straight away. The pods don't restart. This needs the `update` permission on pods in the time-series namespace, which the Helm chart grants. Without it the delay goes back to about a minute and the platform logs a warning.

Hosted instances don't use PgBouncer and are not affected. Writes from devices are not affected either.

## Docker

Prerequisites:

1. Wildcard DNS for `*.ts.<domain>` pointing at the Docker host, where `<domain>` is the `DOMAIN` of your install. Each team server is published as `<random name>.ts.<domain>`.
2. The PgBouncer port open on the host firewall. It is 5432, or the value of `TIMESERIES_PGWIRE_PORT`.
3. `vm.max_map_count=1048576` on the host, for example in `/etc/sysctl.d`. QuestDB needs it.
4. Enough memory on the host for every team's server. The default small tier is limited to 2 GB of memory.
5. A certificate for the platform host name if you want TLS on PgBouncer. See [PgBouncer](#pgbouncer).

The [FlowFuse Docker Compose](https://github.com/FlowFuse/docker-compose) project has the driver configured. Turn it on in `.env` and start the stack with the `timeseries` profile:

```bash
TIMESERIES_ENABLED=true
```

```bash
docker compose -p flowfuse --profile timeseries up -d
```

The variables are:

| Variable | Default | Description |
|----------|---------|-------------|
| `TIMESERIES_ENABLED` | `false` | Turns the feature on |
| `TIMESERIES_IMAGE` | `questdb/questdb:9.0.1` | QuestDB image for new servers |
| `TIMESERIES_PGWIRE_PORT` | `5432` | Host port PgBouncer is published on |
| `TIMESERIES_ALLOW_PRIVATE_NETWORKS` | `false` | See [External servers](#external-servers) |

With TLS on (`TLS_ENABLED`), team host names are served over HTTPS with certificates from the nginx-proxy companion, and PgBouncer asks devices for TLS. Without TLS, devices write over HTTP on port 80 and query without TLS.

nginx-proxy does not support per-path routing from environment variables, so the platform writes one file per team into the shared `vhost.d` volume. It answers `404` for everything except the ILP write paths and `/ping`.

## Kubernetes

Prerequisites:

1. A StorageClass backed by block storage, such as EBS. QuestDB does not support NFS or EFS. Use `forge.timeseries.storageClass`, and a class with `allowVolumeExpansion: true` if teams will resize to bigger disks.
2. `vm.max_map_count=1048576` on every node that runs QuestDB. It is a node setting and cannot be set from a pod. Set it in the node image or launch template, or with a privileged DaemonSet. Use `forge.timeseries.nodeSelector` and `tolerations` to keep QuestDB on nodes that have it.
3. Wildcard DNS for `*.<domain>` pointing at your ingress controller, where `<domain>` is `forge.timeseries.domain` (by default `ts.<forge.domain>`), and a wildcard certificate for it. Put the certificate in a Secret in the timeseries namespace and name it in `forge.timeseries.tlsSecretName`.
4. A `kubernetes.io/tls` Secret for PgBouncer's host name, in the timeseries namespace, named in `forge.timeseries.pgbouncer.tls.secretName`. DNS for that host name must point at PgBouncer's LoadBalancer Service.
5. The namespace of your ingress controller, in `forge.timeseries.networkPolicy.ingressControllerNamespace` (default `ingress-nginx`). The chart's NetworkPolicy admits devices from that namespace only.
6. For backups, a CSI driver with snapshot support and a VolumeSnapshotClass. See [Backups](#backups).

Enable the feature in your Helm values:

```yaml
forge:
  timeseries:
    enabled: true
    storageClass: gp3
    tlsSecretName: ts-wildcard-tls
    pgbouncer:
      tls:
        secretName: ts-pgbouncer-tls
```

The chart creates the namespace, a Role that lets the platform manage the servers in it, a NetworkPolicy, and PgBouncer with its Service. Every value is listed in the [Helm chart README](https://github.com/FlowFuse/helm/blob/main/helm/flowfuse/README.md).

The NetworkPolicy denies all other traffic to QuestDB pods. It admits hosted instances (ports 9000 and 8812), the platform (9000, 8812 and 9003), the ingress controller (9000), PgBouncer (8812) and, if you set one, a monitoring namespace (9003). The policy only takes effect if your cluster's network plugin enforces NetworkPolicy. Any instance can reach any team's server inside the cluster, so the per-team credentials are the boundary there.

Each team's server consists of objects named `ts-<random name>` in the timeseries namespace, labelled `flowfuse.com/component=timeseries`, `flowfuse.com/team=<team id>` and `flowfuse.com/timeseries=<random name>`:

1. A Secret holding the credentials.
2. A PersistentVolumeClaim.
3. A Deployment with one replica and the `Recreate` strategy, because the volume cannot be attached to two pods at once.
4. A ClusterIP Service on ports 9000 and 8812.
5. An Ingress that routes only `/write`, `/api/v2/write` and `/ping`.

The pod runs as a non-root user, and reserves the tier's CPU and memory. The readiness and liveness probes use QuestDB's health port, 9003, and the startup probe allows two minutes for QuestDB to replay its write-ahead log.

If you run the platform on Kubernetes without the Helm chart, the platform's service account needs create, get, list, update and delete on those object kinds in the timeseries namespace and on the PgBouncer team-list Secret, plus the VolumeSnapshot permissions if you use backups.

## Upgrading the QuestDB image

Changing `image` in the configuration only affects servers created afterwards. Existing servers stay on the image they have, so one platform release never restarts every team's server. Platform administrators move a server with the upgrade endpoint:

```bash
curl -X POST https://forge.example.com/api/v1/teams/<team id>/timeseries/<id>/upgrade \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{ "image": "questdb/questdb:9.0.3" }'
```

If `image` is left out, the configured image is used. The response is `202`. The server restarts on the same data, so it is offline for a short time.

QuestDB data written by one major version cannot always be read by an older one. FlowFuse compares the major version in the image tags, for example `9` in `questdb/questdb:9.0.1`. If the major version differs, or either tag has no version in it, such as `latest`, the request is refused with `409 major_upgrade`. Take a [backup](#backups) first, then repeat the request with `"force": true`.

On Docker, a new image that fails to start is replaced by the previous one. On Kubernetes there is no automatic roll back.

## Backups

QuestDB's open source edition has no built-in backup. FlowFuse uses QuestDB's checkpoint feature to make a volume consistent, and takes a snapshot of the volume while the checkpoint is held.

### Kubernetes: nightly snapshots

When snapshots are enabled, a housekeeping task runs once a night, at a random time between 01:00 and 03:59 server time. For each ready managed server it:

1. Runs `CHECKPOINT CREATE` on the server over PGWire.
2. Creates a VolumeSnapshot of the team's volume, named `ts-<random name>-<yyyymmddhhmmss>` in UTC, in the timeseries namespace.
3. Waits until the snapshot has been taken, up to `snapshots.timeout`.
4. Runs `CHECKPOINT RELEASE`. It always does, even when the snapshot failed.
5. Deletes old snapshots.

Retention keeps the newest 7 snapshots, plus the newest snapshot from each of the 4 most recent weeks among the older ones. One team failing does not stop the others, and failures are logged. Suspended servers are not snapshotted.

To turn it on, you need a CSI driver that supports snapshots, with the snapshot controller installed, and a VolumeSnapshotClass:

```yaml
forge:
  timeseries:
    snapshots:
      enabled: true
      volumeSnapshotClass: csi-snapshots
```

This adds the VolumeSnapshot permissions to the platform's Role. If `volumeSnapshotClass` is empty, the cluster's default class is used.

The snapshots stay in your storage system. Whether they survive losing the volume's availability zone or the whole storage system depends on your CSI driver.

### Kubernetes: restore runbook

::warning
These steps have not yet been tested end to end on a real CSI driver. The nightly snapshot task has been checked up to the point where the cluster takes the snapshot, and a restore has not. Rehearse it on a test team before you rely on it.
::

Restoring is an administrator task. The snapshot must come from the same QuestDB major version as the server that will use it.

1. Find the team's server and its snapshots. `<namespace>` is the timeseries namespace, `flowfuse-timeseries` by default.

    ```bash
    kubectl get deployment -n <namespace> -l flowfuse.com/team=<team id>
    kubectl get volumesnapshot -n <namespace> -l flowfuse.com/timeseries=<random name>
    ```

    The Deployment is named `ts-<random name>`.

2. Create a volume from the snapshot you want. Use the same StorageClass as the original volume, and a size at least as big as it.

    ```yaml
    apiVersion: v1
    kind: PersistentVolumeClaim
    metadata:
      name: ts-<random name>-restore
      namespace: <namespace>
    spec:
      accessModes: [ReadWriteOnce]
      storageClassName: <storage class>
      resources:
        requests:
          storage: 20Gi
      dataSource:
        apiGroup: snapshot.storage.k8s.io
        kind: VolumeSnapshot
        name: <snapshot name>
    ```

3. Stop QuestDB. Writes from instances and devices fail until it is back.

    ```bash
    kubectl scale deployment ts-<random name> -n <namespace> --replicas=0
    ```

4. Tell QuestDB to recover from the snapshot by creating an empty `_restore` file in the root of the new volume. QuestDB's user id is 10001. Run a short pod that mounts the new volume, wait for it to finish, then delete it.

    ```yaml
    apiVersion: v1
    kind: Pod
    metadata:
      name: ts-<random name>-restore-trigger
      namespace: <namespace>
    spec:
      restartPolicy: Never
      securityContext:
        runAsUser: 10001
        runAsGroup: 10001
        fsGroup: 10001
      containers:
        - name: touch
          image: busybox:1.36
          command: ["touch", "/var/lib/questdb/_restore"]
          volumeMounts:
            - name: data
              mountPath: /var/lib/questdb
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: ts-<random name>-restore
    ```

5. Point the Deployment at the new volume. The data volume is the first entry in the pod's volumes.

    ```bash
    kubectl patch deployment ts-<random name> -n <namespace> --type json \
      -p '[{"op":"replace","path":"/spec/template/spec/volumes/0/persistentVolumeClaim/claimName","value":"ts-<random name>-restore"}]'
    ```

6. Start QuestDB again and wait for it.

    ```bash
    kubectl scale deployment ts-<random name> -n <namespace> --replicas=1
    kubectl rollout status deployment ts-<random name> -n <namespace>
    ```

7. Check the result. The pod's logs should show QuestDB recovering from the snapshot. Then connect with a PostgreSQL client and check that your tables and recent rows are there, and that `SELECT * FROM wal_tables()` shows no suspended table.

8. Keep the old volume until you are sure of the result, then delete it.

After a restore, the platform still refers to the volume as `ts-<random name>`. Resizing the team's tier grows that old volume, and deleting the team's database removes only that old volume, so delete the `-restore` volume by hand when you remove the database. Moving the data back to a volume with the original name avoids this, at the cost of a second restore.

### Docker: host-level backup

The Docker driver has no scheduled backups. Back up the team's named volume, `ts-<random name>`, from the host. Find the random name in the team's container, `ts-<random name>`, and the credentials in its environment:

```bash
docker inspect ts-<random name> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep QDB_HTTP
```

1. Hold a checkpoint, so the files on disk are consistent. QuestDB's image has no `curl`, so run it from another container on the same network:

    ```bash
    docker run --rm --network <compose network> curlimages/curl -s -G \
      -u '<user>:<password>' --data-urlencode 'query=CHECKPOINT CREATE' \
      http://ts-<random name>:9000/exec
    ```

2. Copy the volume while the checkpoint is held:

    ```bash
    docker run --rm -v ts-<random name>:/data:ro -v /path/to/backups:/backup alpine \
      tar czf /backup/ts-<random name>-$(date +%Y%m%d).tgz -C /data .
    ```

3. Release the checkpoint, even if the copy failed. Only one checkpoint can exist at a time.

    ```bash
    docker run --rm --network <compose network> curlimages/curl -s -G \
      -u '<user>:<password>' --data-urlencode 'query=CHECKPOINT RELEASE' \
      http://ts-<random name>:9000/exec
    ```

These steps follow QuestDB's documentation and have not been tested as a complete procedure with FlowFuse. To restore, stop the container, replace the contents of the volume with the backup, create an empty `_restore` file in the root of the volume, and start the container. The backup and the server must use the same QuestDB major version.

## Monitoring

1. Every QuestDB pod is annotated for Prometheus to scrape port 9003 at `/metrics`. QuestDB's metrics are on, and the port needs no password, which is why the NetworkPolicy only admits the platform and the monitoring namespace you name. Docker servers have metrics on, but nothing scrapes them for you.
2. Alert on pod readiness, restarts and memory near the limit.
3. Alert on disk use, as described next. QuestDB's health port does not show a full disk.

## When the disk is full

QuestDB does not become unhealthy when its volume fills. Reads keep working, `/ping` and the health port on 9003 keep answering as healthy, and the probes keep passing, so Kubernetes and Docker do not restart the server and the platform keeps showing the database as `ready`. What happens instead:

1. Writes over ILP fail with HTTP `500` and an `errno: 28 No space left` error. A few very small writes can still be accepted for a while.
2. QuestDB suspends the table whose write-ahead log it could not apply. Rows it already acknowledged stay in the log, and are not visible to queries until the table is resumed. Nothing detects this except looking at `wal_tables()` and the logs.
3. If the disk fills while writes are arriving, QuestDB occasionally crashes. The container is then restarted by the platform's normal restart policy. A restart does not fix a full disk: the table is suspended again while QuestDB replays its log.
4. Creating tables fails. Queries keep working.

So watch the volume, not the probes:

1. On Kubernetes, alert at 80% and 90% on `kubelet_volume_stats_used_bytes` against `kubelet_volume_stats_capacity_bytes` for the `ts-<random name>` volume claims.
2. On Docker, watch the free space of the host filesystem that holds Docker's volumes.
3. Look for suspended tables. Connect to the server over PGWire and run:

    ```sql
    SELECT * FROM wal_tables() WHERE suspended;
    ```

    For a server on Kubernetes, forward the Service to your machine with `kubectl port-forward -n <namespace> svc/ts-<random name> 8812:8812`. The user name is `t_<random name>`. A platform administrator can read the password from the team's database with `GET /api/v1/teams/<team id>/timeseries/<id>`, or from the `ts-<random name>` Secret.

An empty QuestDB 9.0.1 server already uses roughly 200 MB, so pick storage well above that.

Prevention is easier than recovery: ask teams to set a [TTL](../user/timeseries.md#keeping-the-disk-from-filling) on their tables.

### Recovery

1. Free space first. Do one or more of:
    1. Drop old partitions or tables: `ALTER TABLE <table> DROP PARTITION WHERE <timestamp column> < dateadd('d', -30, now())` or `DROP TABLE <table>`. This works on a table that is not suspended, even with no free space left.
    2. On Kubernetes, grow the volume by moving the team to a tier with a bigger disk. This needs a StorageClass that allows expansion.
2. Make sure there is enough free space for the next step. Resuming a table needs scratch space of the same order as the largest partitions it has to merge. A table that is nearly full will suspend again if there is too little.
3. Resume every suspended table:

    ```sql
    ALTER TABLE <table> RESUME WAL;
    ```

4. Check that `SELECT * FROM wal_tables() WHERE suspended` returns no rows, and that writes work again.

Restarting the server does not resume tables. Setting a TTL on a suspended table only queues the change until the table is resumed, so it cannot rescue a full volume by itself. No acknowledged rows were lost in testing. They became visible once the table resumed.

## Orphan servers

If a server's container or Kubernetes objects exist but the platform has no database for them, for example after a database restore, the platform logs a warning at startup, `Timeseries server <random name> has no database row, leaving it in place`. It never deletes them, because their volume may hold a team's data. Remove them by hand once you have checked.

At startup the platform also finishes work a previous run left half done. A server stuck in `provisioning` is created again, one stuck in `deleting` is deleted again, and a `ready` server whose container or Deployment has gone is created again.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Requests to `/api/v1/teams/<team id>/timeseries` return `404` | The feature is off in `flowforge.yml`, no driver is configured (the log says `Timeseries is enabled but no driver is configured`), or the team's type does not include the Time-Series Database feature |
| A database is `error` | `stateDetail` has the reason. Common ones: the image cannot be pulled, the volume did not bind (wrong or missing StorageClass), the server did not become ready within `readyTimeout`, or a shrinking resize was refused. The platform log has the details. Delete the database and create it again |
| Docker driver fails with `Unable to find the flowforge Docker network` | Set `timeseries.driver.options.network` |
| QuestDB fails to start or keeps crashing | `vm.max_map_count` is too low on the node or host |
| Devices can write but not query | `timeseries.pgbouncer` is missing, or the query port is blocked by a firewall. For a new or just-rotated team, wait for the [reload delay](#reload-delay) |
| Devices cannot connect over TLS | PgBouncer has no certificate (its log warns about it) or devices cannot verify the certificate. Check `pgbouncer.ssl` matches |
| Devices get `404` writing | They are using a path other than `/write`, `/api/v2/write` or `/ping`, or the host name does not resolve to your ingress or nginx-proxy |
| The connection check says `private_address_not_allowed` | The external server is on a private address. See [External servers](#external-servers) |
| A team cannot be deleted | It still owns a managed database. Delete the database first |
| A suspended server will not resume | See the reasons in [Suspended databases](../user/timeseries.md#suspended-databases). A trial-ended server needs the owner to call the resume endpoint |
| Writes fail with `No space left` | See [When the disk is full](#when-the-disk-is-full) |
