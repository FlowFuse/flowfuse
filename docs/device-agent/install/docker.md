---
navGroup: DeviceAgentInstallation
navTitle: Docker Install
navOrder: 4
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

## Verify

Once running and assigned, access the Node-RED editor at `http://<device-ip>:1880`.

## Notes

- Device Agent 3.x requires Node.js 18 in the base image; the `latest` tag uses Node.js 18.
- For 2.x, use a fixed tag like `2.8.0` instead of `latest`.
- Ensure outbound TCP 443 to `app.flowfuse.com` and `mqtt.flowfuse.cloud` and access to `https://registry.npmjs.com` unless using a module cache. See [Running with no access to npmjs.org](../running.md#running-with-no-access-to-npmjsorg).
