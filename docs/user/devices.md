# Devices

The FlowForge platform can be used to manage Node-RED instances running on remote Devices.
A Device runs a software agent that connects back to the platform to receive updates.

This guide explains how to get starting with the Devices feature.

## Installing the Device Agent

The Device Agent is published to the public npm repository as [@flowforge/flowforge-device-agent](https://www.npmjs.com/package/@flowforge/flowforge-device-agent).

It can be installed as a global npm module. This will ensure the agent
command is on the path:

```bash
sudo npm install -g @flowforge/flowforge-device-agent
```

Or you can chose to run the Docker container. When you do, you'll need to mount
the `device.yaml` obtained when [Registering the device](#register-the-device):

```bash
docker run --mount /path/to/device.yml:/opt/flowforge/device.yml -p 1880:1880 flowforge/device-agent:latest
```

## Configuration

### Execution directory

By default the agent uses `/opt/flowforge-device` as its working directory. 
This can be overridden with the `-d/--dir` option.

The directory must exist and be accessible to the user that will be
running the agent.

```bash
sudo mkdir /opt/flowforge-device
sudo chown -R $USER /opt/flowforge-device
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

### Using Device Credentials
Copy the **Device Credentials** information into a file called `device.yml` in
the device configuration directory (`/opt/flowforge-device` or whatever is set
with the `-d` option).

The agent can then be started with the command: [^global-install]

```bash
flowforge-device-agent
```

You will see the device start and perform a 'call-home' where it connects back
to the platform to check what it should be running.

### Using Provisioning Credentials
Copy the **Device Provisioning Credentials** information into a file called `device.yml` in
the device configuration directory (`/opt/flowforge-device` or whatever is set
with the `-d` option).

The agent can then be started with the command: [^global-install]

```bash
flowforge-device-agent
```

You will see the device start and perform a 'call-home' where it connects back
to the platform to auto register itself in the team devices.  If successful,
the real **Device Credentials** are generated and downloaded to the device. 
The original **Provisioning Credentials** will be overwritten meaning subsequent 
runs will not need to perform the auto registration again.

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
`module_cache` directory in the Device Agents Configuration directory as described above.
By default this will be `/opt/flowforge-device/module_cache`.

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
