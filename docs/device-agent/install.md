---
navTitle: Installation
navOrder: 3
---

# Installing Device Agent

## Prerequisites

NodeJS of version 20 or later is recommended, through the device agent supports NodeJS v14 or later.

The Device Agent can be installed on most Linux distributions, Windows, and MacOS.

## Installing the Device Agent

The Device Agent is published to the public npm repository as [@flowfuse/device-agent](https://www.npmjs.com/package/@flowfuse/device-agent).

Note: since the 1.13 release, the package name was updated. See the [updating](#upgrading-the-agent) section for details if you are using the `flowforge` scoped package.

It can be installed as a global npm module. This will ensure the agent
command is on the path:

### Linux/MacOS

```bash
sudo npm install -g @flowfuse/device-agent
```

### Windows (run elevated[^1])

```bash
npm install -g @flowfuse/device-agent
```

### Docker

Or you can chose to run the Docker container. When you do, you'll need to mount
the `device.yml` obtained when [Registering the device](./register.md):

```bash
docker run --mount type=bind,src=/path/to/device.yml,target=/opt/flowfuse-device/device.yml -p 1880:1880 flowfuse/device-agent:latest
```

Or you can chose to run the Docker-Compose via a docker-compose.yml file. When you do, you'll need to mount
the `device.yml` as in Docker obtained when [Registering the device](./register.md):

```yaml
version: '3.9'

services:
  device:
    image: flowfuse/device-agent:latest
    ports:
      - "1880:1880"
    volumes:
      - /path/to/device.yml:/opt/flowfuse-device/device.yml
```

## Configuration

The agent configuration is provided by a `device.yml` file within its working
directory.

### Working directory

By default the agent uses `/opt/flowfuse-device` or `c:\opt\flowfuse-device` as
its working directory. This can be overridden with the `-d/--dir` option.

The directory must exist and be accessible to the user that will be
running the agent.

#### Linux/MacOS

```bash
sudo mkdir /opt/flowfuse-device
sudo chown -R $USER /opt/flowfuse-device
```

#### Windows (run elevated[^1])

```bash
mkdir c:\opt\flowfuse-device
icacls c:\opt\flowfuse-device /grant "user":F /T
```
_where `"user"` is the service account that will run the device agent (ideally, this is NOT an admin account)_

### Listen Port

By default Node-RED will listen to port `1880`. The device agent has a flag to
change this behaviour and listen on another port of choosing: `-p/--port`. This can
be useful for custom firewall rules, or when running multiple device agents on
the same machine.

```bash
flowfuse-device-agent --port=1881
```

## Upgrading the agent

To use the latest features on FlowFuse as well as on the edge device, it is advised to upgrade
the device agent regularly. 

With the 1.13 release of the Device Agent, it has moved to a new package on the npm repository
and DockerHub.

 - npm: `@flowforge/flowforge-device-agent` -> `@flowfuse/device-agent`
 - Docker: `flowforge/device-agent` -> `flowfuse/device-agent`

For backwards compatibility we will continue to publish to both the old and
new locations for a period of time, but we strongly encourage users to update to the
new package to ensure you continue to receive the latest updates.

### Linux/MacOS

```bash
sudo npm install -g @flowfuse/device-agent@latest
```

### Windows (run elevated[^1])

```bash
npm install -g @flowfuse/device-agent@latest
```


[^1]: Run `powershell -Command "Start-Process 'cmd' -Verb runAs` to launching an elevated command prompt window (e.g. as an admin user)
