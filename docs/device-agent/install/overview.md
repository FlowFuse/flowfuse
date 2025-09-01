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

Most users should use the Device Agent Installer. Power users can choose Manual ( using `npm`) or Docker deployments.

- Recommended: Use the Device Agent Installer
  - Fastest way to get started with a one-line command in the [Quick Start guide](../quickstart.md)
  - Full options and service management in the [Installer reference](./device-agent-installer.md)
- Alternative: Manual install (using `npm`)
  - Install the npm package, set working directory, configure, and run as a service. See [Manual install](./manual.md)
- Alternative: Docker / Docker Compose
  - Run the agent in a container; bind-mount the configuration. See [Docker install](./docker.md)

## Prerequisites

- Node.js 18 or later (for Manual install and for running locally)
- Supported OS: Linux, macOS, Windows, or Docker container
- Networking: allow outbound access on 443 to:
  - app.flowfuse.com
  - mqtt.flowfuse.cloud
- Access to npm registry when snapshots are installed: https://registry.npmjs.com

Note: The Device Agent downloads the required Node-RED version and any nodes specified by the assigned snapshot. Ensure firewall/proxy permits access to the npm registry or see [Running with no access to npmjs.org](../running.md#running-with-no-access-to-npmjsorg).

## Verify the installation

After installing by any method:

1. Ensure a working directory exists (default is `/opt/flowfuse-device` or `c:\opt\flowfuse-device`).
2. Provide a device configuration (via Quick Connect, provisioning, or manual `device.yml`). See [Register your Remote Instance](../register.md).
3. Start the agent (service or CLI) and open `http://<device-ip>:1880` when assigned and running.

## What’s next

- Follow the [Quick Start guide](../quickstart.md) to add and connect a Remote Instance
- Learn [how to run and configure the agent](../running.md)
- Use [DevOps Pipelines](/docs/user/devops-pipelines.md) to deploy flows
