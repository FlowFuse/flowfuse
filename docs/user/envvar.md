---
navTitle: Environment Variables
---

# Environment Variables

Environment Variables allow you to manage variables used in your Node-RED flows from the FlowFuse application, you can read more on how to access environment variables inside Node-RED [in the Node-RED Docs](https://nodered.org/docs/user-guide/environment-variables).

An Environment Variable consists of a name and a value.

## Editing 

You can edit the environment variables from the `Settings` tab of an instance, select the `Environment` option from the side menu.

Changes will only take effect when the Node-RED instance is restarted.

## Template provided variables

The [Template](concepts.md#template) may include some predefined environment 
variables that are automatically applied. The template may lock some of those 
variables to prevent an individual instance from changing them.

Variables provided by the template cannot be deleted, however if they are editable,
their value can be set to blank.

## Node-RED instance variables

You can create additional variables for an individual Node-RED instance clicking the `Add variable` button.

You can import variables from a `.env` file using the `Import .env` button.

You can delete a variable using the trash can icon.

The image below shows an instance with the following environment variables:

* `policy_item_locked` - added by the template, locked
* `policy_item_editable` - added by the template, editable
* `FF_INSTANCE_ID` - provided by the platform, locked
* `FF_INSTANCE_NAME` - provided by the platform, locked
* `FF_PROJECT_ID` - provided by the platform, locked, depreciated
* `FF_PROJECT_NAME` - provided by the platform, locked, depreciated
* `INSTANCE_VAR` - added to the instance, editable


<img src="images/project-envvar.png" width="500" />

## Standard environment variables

Standard environment variables are set for all Node-RED instances running
within the platform:

- `FF_INSTANCE_ID`
- `FF_INSTANCE_NAME`

In addition, the following variables are set when running on a device:

- `FF_DEVICE_ID`
- `FF_DEVICE_NAME`
- `FF_DEVICE_TYPE`
- `FF_SNAPSHOT_ID`
- `FF_SNAPSHOT_NAME`

When deploying the same set of flows out to multiple devices, these variables can
be used by the flows to identify the specific device being run on.

NOTE: `FF_SNAPSHOT_NAME` will not be immediately updated when the current snapshot is edited.
It will only be updated when the snapshot is changed or a setting that causes the device to
be restarted is changed.
