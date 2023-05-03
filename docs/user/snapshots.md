---
navTitle: Snapshots
---

# Snapshots

A Snapshot is a point-in-time backup of a Node-RED instance. It captures:
1. The flows
2. Credentials
3. Environment variables
4. NPM packages, with locked versions
5. Runtime settings.

They can also be pushed to devices connected to the instance.

## Create a snapshot

To create a snapshot:

1. Go to the instance's page and select **Snapshots** in the sidebar.
2. Click the **Create Snapshot** button.
3. You will be prompted to give the snapshot a **name** and optional **description**.
4. Click **Create**

The list of snapshots will update with the newly created entry at the top.


## Delete a snapshot

To delete a snapshot:

1. Go to the instance's page and select **Snapshots** in the sidebar.
2. Open the dropdown menu to the right of the snapshot you want to delete and
   select the **Delete snapshot** option.
3. You will be asked to confirm - click **Delete** to continue.

*Note:* If the snapshot is the current **Device Target** snapshot, this will
cause any connected devices to stop running the snapshot when they next check in.

## Setting a Device Target snapshot

Snapshots are used to identify a version of the Node-RED instance that should be pushed
out to any connected devices. This allows you to develop you flows in FlowForge
and only push out to the devices when it is ready.

To set the **Device Target**:

1. Go to the instance's page and select **Snapshots** in the sidebar.
2. Open the dropdown menu to the right of the snapshot you want to set as the
   device target and select the **Set as Device Target** option.
3. You will be asked to confirm - click **Set Target** to continue.

This will cause the snapshot to be pushed out to any connected devices the
next time they check in.

## Creating a Snapshot from a device

It is possible to create a Snapshot from a device that is connected to the platform.
The device must be set to Developer Mode for this to work.
See [Working with Devices](./devices.md#editing-the-node-red-flows-directly-on-a-device) for more information.

## Creating a Snapshot locally

Using the [Node-RED Tools Plugin](./node-red-tools.md) it is also possible to create
Snapshots in a local copy of Node-RED and push them back into your FlowForge
managed Node-RED instances.

For more information, see the [Node-RED Tools Plugin guide](./node-red-tools.md).
