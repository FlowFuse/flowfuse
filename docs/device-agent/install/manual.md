---
navGroup: DeviceAgentInstallation
navTitle: Manual Install with NPM
navOrder: 3
meta:
   description: Install the FlowFuse Device Agent using NPM, configure its working directory and service, and verify the setup.
   tags:
      - device agent
      - npm
      - installation
---

# Manual Install (NPM)

Use this method if you want direct control over the Node.js runtime and filesystem.

## Prerequisites

- Node.js 18 or later installed
- Linux, macOS, or Windows
- Outbound network access to FlowFuse platform and the NPM registry

## Install the Device Agent

The Device Agent is published to npm as [@flowfuse/device-agent](https://www.npmjs.com/package/@flowfuse/device-agent).

### Linux/macOS

```bash
sudo npm install -g @flowfuse/device-agent
```

### Windows (run elevated[^1])

```bash
npm install -g @flowfuse/device-agent
```

## Working directory

By default the agent uses `/opt/flowfuse-device` (Linux/macOS) or `c:\opt\flowfuse-device` (Windows) as its working directory. Override with `-d/--dir` if needed.

Ensure the directory exists and is writable by the service user.

### Linux/macOS

```bash
sudo mkdir -p /opt/flowfuse-device
sudo chown -R $USER /opt/flowfuse-device
```

### Windows (run elevated[^1])

```bash
mkdir c:\opt\flowfuse-device
icacls c:\opt\flowfuse-device /grant "user":F /T
```

Where "user" is the service account that will run the device agent (ideally, not an admin account).

## Configuration

Place a `device.yml` in the working directory. See [Register your Remote Instance](../register.md) for obtaining the configuration via Quick Connect or provisioning.

## Listen Port

Node-RED listens on port `1880` by default. Change with `-p/--port`:

```bash
flowfuse-device-agent --port 1881
```

## Start on system boot

Use the provided systemd service file on Linux to run the agent as a service.

1. Download the service file:

```bash
curl -L https://raw.githubusercontent.com/FlowFuse/device-agent/main/service/flowfuse-device.service -o flowfuse-device.service
```

2. Adjust `User`, `Group`, and `WorkingDirectory` if needed.
3. Update `ExecStart` to include a custom port if required.
4. Move the file into place and enable the service:

```bash
sudo mv flowfuse-device.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable flowfuse-device
sudo systemctl start flowfuse-device
```

On Windows or macOS, consider using the [Installer](./device-agent-installer.md) to set up services automatically.

## Verify

Start the agent from a terminal to confirm it runs:

```bash
flowfuse-device-agent -v
```

Once assigned, access the Node-RED editor at `http://<device-ip>:1880`.

## Networking requirements

Allow outbound TCP 443 to:

- app.flowfuse.com
- mqtt.flowfuse.cloud

Ensure access to npm registry to download Node-RED and nodes:

- https://registry.npmjs.com

For offline environments, see [Running with no access to npmjs.org](../running.md#running-with-no-access-to-npmjsorg).

## Upgrading the agent

With Device Agent 1.13+, the package moved from the `@flowforge` scope to `@flowfuse`:

- npm: `@flowforge/flowforge-device-agent` ➜ `@flowfuse/device-agent`

### Linux/macOS

```bash
sudo npm install -g @flowfuse/device-agent@latest
```

### Windows (run elevated[^1])

```bash
npm install -g @flowfuse/device-agent@latest
```

If you must stay on 2.x, use `@2.x`. Device Agent 3.x requires Node.js 18+.

[^1]: Run `powershell -Command "Start-Process 'cmd' -Verb RunAs"` to launch an elevated command prompt (e.g. as an admin user)
