---
navGroup: DeviceAgentInstallation
navTitle: Device Agent Installer
navOrder: 2
meta:
   description: Learn how to quickly install the FlowFuse Device Agent on your remote device using the FlowFuse Device Agent Installer.
   tags:
      - flowfuse
      - nodered
      - remote device management
      - device agent
      - installation
---

# FlowFuse Device Agent Installer

## What is the FlowFuse Device Agent Installer?

The FlowFuse Device Agent Installer is a CLI tool for the FlowFuse Device Agent that automatically sets up Node.js runtime, installs the device agent package, and configures it as a system service.
Additionally, it provides a simple interface for keeping the device agent up to date.

The FlowFuse Device Agent Installer is the easiest way to get the FlowFuse Device Agent up and running on your remote device.

## Requirements

- Linux, macOS, or Windows
- Internet connection for downloading dependencies
- Administrator/root privileges for system service installation

### Networking requirements

Please see [Networking requirements](../running.md#networking-requirements).

## Use the FlowFuse Device Agent Installer to install or update the FlowFuse Device Agent

### One-line install

For the fastest one-line install experience, see the [Quick Start guide](/docs/device-agent/quickstart.md).

### Manual install

If you prefer to install the FlowFuse Device Agent manually with the Installer, you can follow these steps:

#### 1. Download the installer script:

##### Linux/macOS

```bash
/bin/bash -c "$(curl -fsSL https://flowfuse.github.io/device-agent/get.sh)"
```

##### Windows

```bash
powershell -c "irm https://flowfuse.github.io/device-agent/get.ps1|iex"
```

#### 2. Install the Device Agent using One Time Code

##### Linux/MacOS

```bash
./flowfuse-device-agent-installer --otc <one-time-code>
```

##### Windows (run elevated[^1])

```bash
flowfuse-device-agent-installer.exe --otc <one-time-code>
```

### Other installation options

#### Install without One Time Code

You can also install the FlowFuse Device Agent without a One Time Code by providing the `device.yml` content during interactive installation. To do this, run the installer without the `--otc` flag.

##### Linux/MacOS

```bash
./flowfuse-device-agent-installer
```

##### Windows (run elevated[^1])

```bash
flowfuse-device-agent-installer.exe
```

#### Install in custom directory

There is a possibility to install the Device Agent in a custom directory by using the `--dir` option. For example:

##### Linux/MacOS

```bash
./flowfuse-device-agent-installer --dir /path/to/custom/dir
```

##### Windows (run elevated[^1])

```bash
flowfuse-device-agent-installer.exe --dir C:\path\to\custom\dir
```

#### Install on custom port

You can configure a custom port using the `--port` flag. The service name includes the port, for example `flowfuse-device-agent-1882` for `--port 1882`.

##### Linux/MacOS

```bash
./flowfuse-device-agent-installer --port 1882
```

##### Windows (run elevated[^1])

```bash
flowfuse-device-agent-installer.exe --port 1882
```

## Updating components

### Node.js runtime
To update bundled Node.js runtime, specify the `--update-nodejs` flag with the desired version:

```bash
./flowfuse-device-agent-installer --update-nodejs --nodejs-version 20.19.1
```

Specifying `--update-nodejs` without a version will pick the default version defined in the installer.

### Device Agent
To update the Device Agent package, use the `--update-agent` flag, optionally specifying the version:

```bash
./flowfuse-device-agent-installer --update-agent --agent-version 3.3.2
```

Specifying `--update-agent` without the `--agent-version` flag will update to the latest available version.

## Troubleshooting

### Managing the Device Agent service

Services are named per-port, for example `flowfuse-device-agent-1880`. On macOS, the launchd label is `com.flowfuse.device-agent-1880`.

#### Linux (systemd)

```bash
sudo systemctl start flowfuse-device-agent-<port>
sudo systemctl stop flowfuse-device-agent-<port>
sudo systemctl restart flowfuse-device-agent-<port>
sudo systemctl status flowfuse-device-agent-<port>
```

#### Linux (SysVinit)

```bash
sudo service flowfuse-device-agent-<port> start
sudo service flowfuse-device-agent-<port> stop
sudo service flowfuse-device-agent-<port> restart
sudo service flowfuse-device-agent-<port> status
```

#### Linux (OpenRC)

```bash
sudo rc-service flowfuse-device-agent-<port> start
sudo rc-service flowfuse-device-agent-<port> stop
sudo rc-service flowfuse-device-agent-<port> restart
sudo rc-service flowfuse-device-agent-<port> status
```

#### macOS (launchd)

```bash
sudo launchctl start com.flowfuse.device-agent-<port>
sudo launchctl stop com.flowfuse.device-agent-<port>
sudo launchctl kickstart -k system/com.flowfuse.device-agent-<port>
sudo launchctl print system/com.flowfuse.device-agent-<port>
```

#### Windows (Service Control)

```bash
sc.exe start flowfuse-device-agent-<port>
sc.exe stop flowfuse-device-agent-<port>
sc.exe query flowfuse-device-agent-<port>
```

### Viewing Device Agent log files

Adjust the path if custom directory has been specified during installation.

#### Linux/macOS:

```bash
tail -f /opt/flowfuse-device/logs/flowfuse-device-agent.log
```

#### Linux (systemd):
```bash
journalctl -f -u 'flowfuse-device-agent-<port>'
```

#### Windows:
```powershell
Get-Content -Path 'C:\opt\flowfuse-device\flowfuse-device-agent.log' -Wait
```

### Error: Disk space check failed

> [ERROR] Disk space check failed: insufficient disk space in temporary directory (/tmp): need at least 500.0 MB, available 490.4 MB

#### Cause:
The `Disk space check failed` error indicates that the installer has detected insufficient disk space in the temporary directory.
The FlowFuse Device Agent Installer requires a minimum of 500MB of free disk space in the temporary directory to ensure proper installation.

This error might also appear if there is not enough space on the disk partition where the Device Agent is being installed.
Make sure that the target installation directory has at least 500MB of free space available.
[Adjust installation directory](/docs/device-agent/install/device-agent-installer/#install-in-custom-directory) accordingly.

#### Solution:
To fix this issue, you can try to free up some disk space by deleting unnecessary files or moving them to another location.
Alternatively, you can specify a different temporary directory with sufficient space by setting proper environmental variable before running the installer.

**On Linux/macOS**, set the `TMPDIR` environment variable:

```bash
export TMPDIR=/path/to/existing/directory/with/sufficient/space
```

**On Windows**, you can set the `TEMP` or `TMP` environment variable:
```powershell
Set TMP="C:\path\to\existing\directory\with\sufficient\space"
```

Retry installation after making these adjustments.

## Further reading

For more detailed technical information about the FlowFuse Device Agent, like list of supported parameters or how to contribute, please refer to the [documentation](https://github.com/FlowFuse/device-agent/blob/main/installer/README.md).

[^1]: Run `powershell -Command "Start-Process 'cmd' -Verb RunAs"` to launch an elevated command prompt window (e.g. as an admin user)