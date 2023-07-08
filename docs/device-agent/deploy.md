---
navTitle: Deploying your Flows
navOrder: 5
---

# Deploying Flows to the Device Agent

Before you're able to deploy your flows to your device,
you will have needed to have completed these steps:

1. [Install the Device Agent on the Device](./install.md) - installs Node-RED and other requirements in order to communicate with FlowForge.
2. [Register the Device with FlowForge](./register.md) - this step will have provided you with a `device.yml` file to move to your Device.
3. [Run the Device Agent](./running.md) - starts the Device Agent on the Device.

## Deploying a Node-RED instance to the device

To deploy a Node-RED instance to the device:

1. [Create a snapshot](../user/snapshots.md#create-a-snapshot) - a point-in-time
backup of the Node-RED flows and configuration.
2. [Mark that snapshot](../user/snapshots.md#setting-a-device-target-snapshot) as the **Device Target** snapshot.

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

You will be prompted to give the snapshot a name and description. See [Snapshots](../user/snapshots.md) for more information
about working with snapshots.

### Important Notes

* Remote access to the editor requires Device Agent v0.8.0 or later.
* The Web UI requires Device Agent v0.9.0 or later.
* The device must first have a snapshot applied before editor access is possible.
* The device will not receive any updates from the platform while in Developer Mode.
* Disabling Developer Mode will cause the device to check-in with the platform. If the device flows hve changed, it will be reloaded with the current target snapshot assigned to that device, causing any changes made in Developer Mode to be overwritten. Therefore, it is recommended to create a snapshot of the changes before disabling Developer Mode.
* The device must be online and connected to the platform to enable "Editor Access".
* To minimise server and device resources, it is recommended to disable "Editor Access" when not actively developing flows on a device.