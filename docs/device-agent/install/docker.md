---
navGroup: DeviceAgentInstallation
navTitle: Docker Install
navOrder: 3
meta:
   description: Run the FlowFuse Device Agent with Docker or Docker Compose, including configuration binding, ports, time zone, and verification steps.
   tags:
      - device agent
      - docker
      - docker compose
      - installation
---

# Docker Install

Run the Device Agent in a container. Bind-mount your `device.yml` and expose the editor port.

## Prerequisites

- Docker or Docker Compose
- A `device.yml` configuration from [Register your Remote Instance](../register.md)

## Docker run

```bash
docker run \
  --mount type=bind,src=/path/to/device.yml,target=/opt/flowfuse-device/device.yml \
  -p 1880:1880 \
  flowfuse/device-agent:latest
```

### Time zone

Set the container time zone using the `TZ` environment variable:

```bash
docker run \
  -e TZ=Europe/London \
  --mount type=bind,src=/path/to/device.yml,target=/opt/flowfuse-device/device.yml \
  -p 1880:1880 \
  flowfuse/device-agent:latest
```

## Docker Compose

```yaml
version: '3.9'

services:
  device:
    image: flowfuse/device-agent:latest
    ports:
      - "1880:1880"
    volumes:
      - /path/to/device.yml:/opt/flowfuse-device/device.yml
    environment:
      - TZ=UTC
```

## Running as a non-root user

From Device Agent v4, the container no longer runs as `root`. It runs as the unprivileged `flowfuse` user (UID `2000` / GID `2000`), following least-privilege security practices.

This affects bind-mounted directories: the directory the agent uses for its state must be writable by UID/GID `2000`, otherwise the agent will fail to start with a permissions error.

Before upgrading an existing container to v4, update the ownership of any mounted directory so the `flowfuse` user can access it:

```bash
sudo chown -R 2000:2000 /path/to/config/dir
```

Alternatively, run the container as a user of your choosing with the `--user` flag:

```bash
docker run \
  --user 1000:1000 \
  --mount type=bind,src=/path/to/device.yml,target=/opt/flowfuse-device/device.yml \
  -p 1880:1880 \
  flowfuse/device-agent:latest
```

## Verify

Once running and assigned, access the Node-RED editor at `http://<device-ip>:1880`.

## Notes

- Device Agent 4.x defaults to Node.js 22; the `latest` tag now uses Node.js 22. Node.js 20 reached end-of-life in April 2026.
- Device Agent 3.x uses Node.js 18 in the base image. To stay on a specific line, use a fixed tag instead of `latest`.
- For 2.x, use a fixed tag like `2.8.0` instead of `latest`.
- Ensure outbound TCP 443 to `app.flowfuse.com` and `mqtt.flowfuse.cloud` and access to `https://registry.npmjs.com` unless using a module cache. See [Running with no access to npmjs.org](../running.md#running-with-no-access-to-npmjs.org).
