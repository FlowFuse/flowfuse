---
navTitle: Installation
navOrder: 3
---

# Installing Device Agent

## Prerequisites

NodeJS of version 20 or later is recommended, through the device agent supports NodeJS v14 or later.

The Device Agent can be installed on most Linux distributions, Windows, and MacOS.

## Installing the Device Agent

The Device Agent is published to the public npm repository as [@flowforge/flowforge-device-agent](https://www.npmjs.com/package/@flowforge/flowforge-device-agent).

It can be installed as a global npm module. This will ensure the agent
command is on the path:

### Linux/MacOS

```bash
sudo npm install -g @flowforge/flowforge-device-agent
```

### Windows

```bash
npm install -g @flowforge/flowforge-device-agent
```

### Docker

Or you can chose to run the Docker container. When you do, you'll need to mount
the `device.yml` obtained when [Registering the device](./register.md):

```bash
docker run --mount type=bind,src=/path/to/device.yml,target=/opt/flowforge-device/device.yml -p 1880:1880 flowforge/device-agent:latest
```

Or you can chose to run the Docker-Compose via a docker-compose.yml file. When you do, you'll need to mount
the `device.yml` as in Docker obtained when [Registering the device](./register.md):

```yaml
version: '3.9'

services:
  device:
    image: flowforge/device-agent:latest
    ports:
      - "1880:1880"
    volumes:
      - /path/to/device.yml:/opt/flowforge-device/device.yml
```

## Configuration

The agent configuration is provided by a `device.yml` file within its working
directory.

### Working directory

By default the agent uses `/opt/flowforge-device` or `c:\opt\flowforge-device` as
its working directory. This can be overridden with the `-d/--dir` option.

The directory must exist and be accessible to the user that will be
running the agent.

#### Linux/MacOS

```bash
sudo mkdir /opt/flowforge-device
sudo chown -R $USER /opt/flowforge-device
```

#### Windows (run elevated)

```bash
mkdir c:\opt\flowforge-device
```

### Listen Port

By default Node-RED will listen to port `1880`. The device agent has a flag to
change this behaviour and listen on another port of choosing: `-p/--port`. This can
be useful for custom firewall rules, or when running multiple device agents on
the same machine.

```bash
flowforge-device-agent --port=1881
```

## Upgrading the agent

To use the latest features on FlowFuse as well as on the edge device, it is advised to upgrade
the device agent regularly. 

### Linux/MacOS

```bash
sudo npm install -g @flowforge/flowforge-device-agent
```

### Windows

```bash
npm install -g @flowforge/flowforge-device-agent
```
