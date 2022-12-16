# Devices

The FlowForge platform can be used to manage projects running on remote Devices.
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
docker run --mount /path/to/device.yml:/opt/flowforge/device.yaml -p 1880:1880 flowforge/device-agent:latest
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

To connect a device to the platform it must be registered in order to generate
a set of credentials for it to use.

The device is first registered to a team and then assigned to the project it
should run.

1. Go to your teams's **Devices** page.
2. Click the **Register Device** button.
3. You will be prompted to give the device a **name** and an optional **type**.
   The type field can be used to record additional meta information about the device.
4. Click **Register**

Once the device has been registered, you will be shown the **Device Credentials** 
dialog. This is the only time the platform will show you this information without
resetting it. Make sure to take a copy or use the **Download** button to save
the configuration file locally.

## Connect the device

Copy the **Device Credentials** information into a file called `device.yml` in
the device configuration directory (`/opt/flowforge-device` or whatever is set
with the `-d` option).

The agent can then be started with the command:

```bash
flowforge-device-agent
```

*Note:* This assume the agent was installed as a global npm module and your path
is properly configured to pick that up.

You will see the device start and perform a 'call-home' where it connects back
to the platform to check what it should be running.

## Assign the device to a project

The next step is to assign the device to a project.

1. Go to your teams's **Devices** page.
2. Open the dropdown menu to the right of the device you want to assign and
   select the **Add to project** option.
3. Select the project to add the project to in the dialog - click **Add** to continue.

## Deploying a project to the device

To deploy a project to the device:

1. [Create a snapshot](snapshots.md#create-a-snapshot) - a point-in-time
backup of the project
2. [Mark that snapshot](snapshots.md#setting-a-device-target-snapshot) as the **Device Target** snapshot.

This model allows you to develop your project in FlowForge and only push it out
to the registered devices when you're happy with what you've created.

## Remove a device from a project

To remove the device from the project:

1. Go to your teams's **Devices** page.
2. Open the dropdown menu to the right of the device you want to remove and
   select the **Remove from project** option.
3. Confirm the action by clicking the **Remove** option.

The device will stop running the current project and wait to be added back to
a project.

## Regenerating credentials

To regenerate device credentials:

1. Go to your teams or project's **Devices** page.
2. Open the dropdown menu to the right of the device and select the
   **Regenerate credentials** option.
3. You will need to confirm this action as the existing credentials will be
   immediately revoked. If the device tries to use the old credentials it will
   fail to connect and will delete its local copy of the project snapshot it was
   running. Click **Regenerate credentials** to continue.

You will then be shown the **Device Credentials** dialog again with a new set of
credentials to copy or download.

## Deleting a device

To delete a device:

1. Go to your teams or project's **Devices** page.
2. Open the dropdown menu to the right of the device and select the
   **Delete device** option.
3. Confirm the action by clicking the **Delete** option.

The next time the device calls home it will find it is no longer authorised and
will stop and delete its local copy of the project it was running.

