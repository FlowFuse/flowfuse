---
navGroup: DeviceAgentInstallation
navTitle: Overview
navOrder: 1
meta: 
   description: Explore step-by-step instructions to install and configure the FlowFuse Device Agent on various platforms, ensuring seamless connectivity with FlowFuse Cloud and MQTT services.
   tags:
      - installation 
      - device agent
      - flowfuse
---

# Installing Device Agent

## Choose your install path

**Recommended for most users:** Use the Device Agent Installer (Quick Start), the fastest way to deploy with minimal configuration. Power users can choose Manual (using `npm`), Docker, or Kubernetes deployments.

### Quick install

Run the one-line installer on your device. It installs Node.js, registers the device on your FlowFuse platform, and configures it to run as a local service.

**Linux / macOS**

```bash
/bin/bash -c "$(curl -fsSL https://flowfuse.github.io/device-agent/get.sh)" && ./flowfuse-device-agent-installer
```

**Windows** — run in an elevated PowerShell terminal:

```powershell
Set-Location $env:USERPROFILE; powershell -c "irm https://flowfuse.github.io/device-agent/get.ps1 | iex"; .\flowfuse-device-agent-installer.exe
```

See the [Quick Start guide](../quickstart.md) for the full walkthrough, or the [Installer reference](./device-agent-installer.md) for all options and service management.

### Alternative install paths

- Manual install using `npm`. Install the npm package, set the working directory, configure, and run as a service. See [Manual install](./manual.md)
- Docker or Docker Compose. Run the agent in a container and bind-mount the configuration. See [Docker install](./docker.md)
- Kubernetes. Deploy the agent in a Kubernetes cluster. See [Kubernetes install](./kubernetes.md)

## Prerequisites

- Node.js is only a prerequisite for the Manual install. The Device Agent Installer and the official Docker image bring their own runtime, defaulting to Node.js 22, which is the recommended version. For a manual install you need Node.js 18 or later; supported versions are 18, 20, 22 and 24. Node.js 20 reached end-of-life in April 2026.
- Supported OS: Linux, macOS, Windows, or Docker container
- Networking: allow outbound access on 443 to:
  - `app.flowfuse.com`
  - `mqtt.flowfuse.cloud`
- Access to npm registry when snapshots are installed: https://registry.npmjs.com

Note: The Device Agent downloads the required Node-RED version and any nodes specified by the assigned snapshot. Ensure firewall/proxy permits access to the npm registry or see [Running with no access to npmjs.org](../running.md#running-with-no-access-to-npmjs.org).

### Networking requirements

If you're working behind a firewall, and need to configure it to allow the Device Agent to connect to FlowFuse and the npm registry, see the following:

Allow outbound TCP 443 to:

- `app.flowfuse.com`
- `mqtt.flowfuse.cloud`
- `registry.flowfuse.cloud`
- `registry.flowfuse.com`

Ensure access to npm registry to download Node-RED and nodes:

- `https://registry.npmjs.com`

For offline environments, see [Running with no access to npmjs.org](../running.md#running-with-no-access-to-npmjs.org).


## Verify the installation

After installing by any method:

1. Ensure a working directory exists (default is `/opt/flowfuse-device` or `c:\opt\flowfuse-device`) and contains a `device.yml`.
2. Check the service is running. The installer names it after the port, so the default is `flowfuse-device-agent-1880`: `sudo systemctl status flowfuse-device-agent-1880`.
3. Confirm the Remote Instance shows as running in FlowFuse, then open `http://<device-ip>:1880` once a snapshot is assigned.

The installer registers the device for you. If you are installing by one of the alternative paths above, register it yourself: see [Register your Remote Instance](../register.md).

## What’s next

- Follow the [Quick Start guide](../quickstart.md) to add and connect a Remote Instance
- Learn [how to run and configure the agent](../running.md)
- Use [DevOps Pipelines](/docs/user/devops-pipelines.md) to deploy flows
