---
navtitle: FlowForge Device Agent
---

# Devices

The FlowForge platform can be used to manage Node-RED instances running on remote Devices.
A Device runs a software agent that connects back to the platform to receive updates.

This guide explains how to get starting with the Devices feature.

## Prerequisites

 - NodeJS v16 or later
 
## Supported Operating Systems

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


Or you can chose to run the Docker container. When you do, you'll need to mount
the `device.yaml` obtained when [Registering the device](#register-the-device):

```bash
docker run --mount /path/to/device.yml:/opt/flowforge-device/device.yml -p 1880:1880 flowforge/device-agent:latest
```

Or you can chose to run the Docker-Compose via a docker-compose.yml file. When you do, you'll need to mount
the `device.yaml` as in Docker obtained when [Registering the device](#register-the-device):

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

## Register the device
To connect a device to the platform, it needs a set of credentials. 

There are two types of credentials to choose from:

* **Device Credentials**: for connecting a single device to the platform
* **Provisioning Credentials**: for setting up one or more devices to automatically register themselves on the platform

### Generating "Device Credentials" 
_for a single device_

1. Go to your teams's **Devices** page.
2. Click the **Register Device** button.
3. You will be prompted to give the device a **name** and an optional **type**.
   The type field can be used to record additional meta information about the device.
4. Click **Register**

Once the device has been registered, you will be shown the **Device Credentials** 
dialog. This is the only time the platform will show you this information without
resetting it. Make sure to take a copy or use the **Download** button to save
the configuration file locally.

Repeat these steps for each device you want to connect to the platform.


### Generating "Provisioning Credentials" 
_for automatic registration of one or more devices_

1. Go to your teams's **Settings** page.
2. Open the **Device** tab.
2. Click the **Create Provisioning Token** tab.
3. You will be prompted to give the token a **name** and to chose what **instance**, if any, the device should be assigned to.
4. Click **Create**

Once the Provisioning Token has been created, you will be shown the 
**Device Provisioning Credentials** dialog. This is the only time the 
platform will show you this information. 
Make sure to take a copy or use the **Download** button to save
the configuration file locally.

## Connect the device

### Install the credentials

Before you can connect a device to the platform, the device must have
a **Device Credentials** file or a **Device Provisioning Credentials** 
file present in its working directory. There are two ways to do this:
1. Copy the credentials file into the device's 
[Working Directory](#working-directory).
2. Download the credentials file to the device using its built in Web UI.
NOTE: The Device Agent must be running and the command line flag for the Web UI must be enabled.
See [Command Line Options](#device-agent-command-line-options) for more information.

### Copy method

Place the **Device Credentials** or **Device Provisioning Credentials** file on the device
in the [Working Directory](#working-directory)

The agent can then be started with the command: [^global-install]

```bash
flowforge-device-agent
```

You will see the device start and perform a 'call-home' where it connects back
to the platform to check what it should be running.

### Download method

If the Device Agent is running with the Web UI enabled, you can download the
credentials file to the device using the Web UI. This is useful if you don't
have direct access to the device's file system. Once the credentials file is
downloaded, the device agent will automatically restart and load the credentials.

#### Additional Information

If you copy or download a **Device Provisioning Credentials** file to the device,
you will see the device start and perform a 'call-home' where it connects back
to the platform to auto register itself in the team devices.  If successful,
the real **Device Credentials** are generated and downloaded to the device. 
The original **Provisioning Credentials** will be overwritten meaning subsequent 
runs will not need to perform the auto registration again.

## Device Agent Command Line Options

The following command line options are available:

```
Options

  -c, --config file     Device configuration file. Default: device.yml
  -d, --dir dir         Where the agent should store its state. Default: /opt/flowforge-device 
  -i, --interval secs
  -p, --port number
  -m, --moduleCache     Use local npm module cache rather than install

Web UI Options

  -w, --ui            Start the Web UI Server (optional, does not run by default)       
  --ui-host string    Web UI server host. Default: (0.0.0.0) (listen on all interfaces) 
  --ui-port number    Web UI server port. Default: 1879
  --ui-user string    Web UI username. Required if --ui is specified
  --ui-pass string    Web UI password. Required if --ui is specified
  --ui-runtime mins   Time the Web UI server is permitted to run. Default: 10

Global Options

  -h, --help       print out helpful usage information 
  --version        print out version information       
  -v, --verbose    turn on debugging output
```

### Command Line Examples

_Start the agent with a different port number_

```bash
flowforge-device-agent -p 8080
```


_Start the agent with a different working directory and the Web UI enabled_

```bash
flowforge-device-agent -d /path/to/working/directory -w --ui-user admin --ui-pass password --ui-port 8081
```


## Assign the device to a Node-RED instance

The next step is to assign the device to a Node-RED instance.

1. Go to your teams's **Devices** page.
2. Open the dropdown menu to the right of the device you want to assign and
   select the **Add to Application Instance** option.
3. Select the instance in the dialog and click **Add** to continue.

## Deploying a Node-RED instance to the device

To deploy a Node-RED instance to the device:

1. [Create a snapshot](snapshots.md#create-a-snapshot) - a point-in-time
backup of the Node-RED flows and configuration.
2. [Mark that snapshot](snapshots.md#setting-a-device-target-snapshot) as the **Device Target** snapshot.

This model allows you to develop your flows in FlowForge and only push it out
to the registered devices when you're happy with what you've created.

## Editing the Node-RED flows on a device

The device agent does not allow local access to the Node-RED editor. This ensures
the device is running the deployed snapshot without modification.

When running on FlowForge Cloud, or a premium licensed FlowForge instance, a
device can be placed in Developer Mode that enables remote access to the editor.

This can then be used to develop the flows directly on the device and a new snapshot
generated from the device that can be deployed to other devices in the application.

Whilst in Developer Mode the device will not receive new updates from the platform
when new snapshots are deployed.

**Enabling Developer Mode**

1. Go to your teams's **Devices** page.
2. Select the device you want to edit by clicking its name.
3. Click the "Developer Mode" button to enable developer mode.
4. Once enabled, a Developer Mode Options panel is shown on the Device overview page.


**Accessing the Editor**

1. Once developer mode is enabled, click the **Enable** button next to the 'Editor Access' option
2. When the editor is available, the Editor button in the header will become active and will take you to the device editor.

**Creating a Device Snapshot**

To create an instance snapshot from the device use the **Create Snapshot** button
in the Developer Mode options panel.

You will be prompted to give the snapshot a name and description. See [Snapshots](snapshots.md) for more information
about working with snapshots.

### Important Notes

* Remote access to the editor requires Device Agent v0.8.0 or later.
* The Web UI requires Device Agent v0.9.0 or later.
* The device must first have a snapshot applied before editor access is possible.
* The device will not receive any updates from the platform while in Developer Mode.
* Disabling Developer Mode will cause the device to check-in with the platform. If the device flows hve changed, it will be reloaded with the current target snapshot assigned to that device, causing any changes made in Developer Mode to be overwritten. Therefore, it is recommended to create a snapshot of the changes before disabling Developer Mode.
* The device must be online and connected to the platform to enable "Editor Access".
* To minimise server and device resources, it is recommended to disable "Editor Access" when not actively developing flows on a device.

## Remove a device from a Node-RED instance

To remove the device from a Node-RED instance:

1. Go to your teams's **Devices** page.
2. Open the dropdown menu to the right of the device you want to remove and
   select the **Remove from application instance** option.
3. Confirm the action by clicking the **Remove** option.

The device will stop running the current Node-RED flows. It will then wait
until it is assigned to another instance.

## Regenerating credentials

To regenerate device credentials:

1. Go to your team's or instance's **Devices** page.
2. Open the dropdown menu to the right of the device and select the
   **Regenerate credentials** option.
3. You will need to confirm this action as the existing credentials will be
   immediately revoked. If the device tries to use the old credentials it will
   fail to connect and will delete its local copy of the snapshot it was
   running. Click **Regenerate credentials** to continue.

You will then be shown the **Device Credentials** dialog again with a new set of
credentials to copy or download.

## Deleting a device

To delete a device:

1. Go to your team's or instance's **Devices** page.
2. Open the dropdown menu to the right of the device and select the
   **Delete device** option.
3. Confirm the action by clicking the **Delete** option.

The next time the device attempts to connect to the platform it will find it is
no longer authorised and will stop and delete its local copy of the flows it was running.

## Running with no access to npmjs.org

By default the Device Agent will try and download the correct version of Node-RED and 
any nodes required to run the Snapshot that is assigned to run on the device.

If the device is being run on an offline network or security policies prevent the 
Device Agent from connecting to npmjs.org then it can be configured to use a pre-cached 
set of modules.

You can enable this mode by adding `-m` to the command line adding `moduleCache: true` 
to the `device.yml` file. This will cause the Device Agent to load the modules from the 
`module_cache` directory in the Device Agents [Working Directory](#working-directory) (or whatever is set
with the `-d` option) (e.g. `/opt/flowforge-device/module_cache`.).

### Creating a module cache

To create a suitable module cache, you will need to install the modules on a local device with
access to npmjs.org, ensuring you use the same OS and Architecture as your target
device, and then copy the modules on to your device.

1. From the Snapshot page, select the snapshot you want to deploy and select the option to download its `package.json` file.
2. Place this file in an empty directory on your local device.
3. Run `npm install` to install the modules. This will create a `node_modules` directory.
4. On your target device, create a directory called `module_cache` inside the Device Agent Configuration directory.
5. Copy the `node_modules` directory from your local device to the target device so that it is under the `module_cache` directory.

<br>

[^global-install]: Starting the agent via the command `flowforge-device-agent` assumes it was installed as a global npm module and your path is properly configured to pick that up.

## Running the device agent as a service on a Raspberry Pi

Can can run the device agent as a service, this means it can run in the background and be enabled to automatically start on boot.

### Creating a Service File

The first step is creating the systemd unit file for your service. You can start by creating a new file in the /etc/systemd/system directory with a .service file extension:

```sudo nano /etc/systemd/system/flowforge-device-agent.service```

The recommended content for the service file can be found here [this Github page](https://github.com/flowforge/flowforge-device-agent/blob/main/service/flowforge-device.service).

### Starting the service on boot (optional)

If you want Node-RED to run when the device is turned on, or re-booted, you can enable the service to autostart by running the command:

```sudo systemctl enable flowforge-device-agent.service```

To disable the service, run the command:

```sudo systemctl disable flowforge-device-agent.service```

### Controlling the service

You can start the service with the command:

```sudo systemctl start flowforge-device-agent```

You can check the current status with the command:

```sudo systemctl status flowforge-device-agent```

You can stop your with the command:

```sudo systemctl stop flowforge-device-agent```

## Node-RED Settings

Most Node-RED settings are managed by the platform as part of deploying an instance
to the device. However some settings can be overridden locally on the device.

### HTTPS configuration

*Available in Device Agent 0.10+*

The `https` configuration option in `device.yml` can be used to enable HTTPS within Node-RED. The values
are passed through to the [Node-RED `https` setting](https://nodered.org/docs/user-guide/runtime/configuration).

The `ca`, `key` and `cert` properties can be used to provide custom certificates and keys.
The values should be set to the contents of the certificate/key.

Alternatively, the properties `caPath`, `keyPath` and `certPath` can be used instead
to provide absolute paths to files containing the certificates/keys.

```yml
https:
   keyPath: /opt/flowforge-device/certs/key.pem
   certPath: /opt/flowforge-device/certs/cert.pem
   caPath: /opt/flowforge-device/certs/ca.pem
```

### `httpStatic` configuration

*Available in Device Agent 0.10+*

This option can be used to serve content from a local directory.

If set to a path, the files in that directory will be served relative to `/`.

```yml
httpStatic: /opt/flowforge-device/static-content
```

It is also possible to configure it with a list of directories and the corresponding
path they should be served from.

```yml
httpStatic:
  - path: /opt/flowforge-device/static-content/images
    root: /images
  - path: /opt/flowforge-device/static-content/js
    root: /js
```

## Troubleshooting

If you have problems with the device agent the first thing to do is to enable the verbose logging mode.

To do this add a `-v` to the command line. This will present a lot more information about what the agent is doing.
It will show that is has connected to the FlowForge instance and every time it checks in, it will also log all the 
local HTTP requests made when accessing the Node-RED Editor via the FlowForge application.
