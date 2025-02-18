---
navTitle: Installation
navOrder: 3
meta: 
   description: Explore step-by-step instructions to install and configure the FlowFuse Device Agent on various platforms, ensuring seamless connectivity with FlowFuse Cloud and MQTT services.
   tags:
      - installation 
      - device agent
      - flowfuse
---

# Installing Device Agent

## Prerequisites

#### NodeJS Version

The Device Agent requires Node.js 18 or later.

#### Operating System/Image**

It can be installed on most Linux distributions, Windows, and MacOS, or via the provided Docker image.

#### Networking

The Device Agent connects back to the FlowFuse platform on port 443. You will need to ensure your network permits traffic on that port. For FlowFuse Cloud, the device agent will connect to:
    - `app.flowfuse.com:443`
    - `mqtt.flowfuse.cloud:443`

Additionally, the Device Agent does not install Node-RED at startup. When the agent receives a snapshot to run, it will need to download the required Node-RED version mentioned in the snapshot. Therefore, ensure that your firewall allows access to the following npm registry endpoint:

- `https://registry.npmjs.com`

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

#### Time Zone

In order to ensure that the device agent runs with the correct timezone environment variable is set with the `-e` option

```bash
docker run -e TZ=Europe/London --mount type=bind,src=/path/to/device.yml,target=/opt/flowfuse-device/device.yml -p 1880:1880 flowfuse/device-agent:latest
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

### Start Device Agent on system boot

To start the device agent on system boot, you can use the provided systemd service file.

1. Download the file:

```bash
curl -L https://raw.githubusercontent.com/FlowFuse/device-agent/refs/heads/main/service/flowfuse-device.service -o flowfuse-device.service
```

2. Adjust `User`, `Group` and `WorkingDirectory` if needed
3. Change the `ExecStart` command to start the Agent on [different port](#listen-port), if needed
4. Move the service file to `/etc/systemd/system/` directory
   
```bash
sudo mv flowfuse-device.service /etc/systemd/system/
```

5. Reload the systemd daemon

```bash
sudo systemctl daemon-reload
```

6. Enable the service to start on boot

```bash
sudo systemctl enable flowfuse-device
```

7. Start the service

```bash
sudo systemctl start flowfuse-device
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

### Upgrading to Device Agent 3.x

Version 3.x of the Device Agent requires Node.js 18 as a minimum; older versions of Node.js are no longer supported.

The `latest` tagged Docker image is now based on Node.js 18.

If you are not able to update to Node.js 18 or later at this time, you should stay on the Device Agent 2.x release. For the install commands below, this means using `@2.x` instead of `@latest`. In the case of Docker, make sure you use the `2.8.0` tag instead of `latest`.

### Linux/MacOS

```bash
sudo npm install -g @flowfuse/device-agent@latest
```

### Windows (run elevated[^1])

```bash
npm install -g @flowfuse/device-agent@latest
```


[^1]: Run `powershell -Command "Start-Process 'cmd' -Verb runAs` to launching an elevated command prompt window (e.g. as an admin user)
