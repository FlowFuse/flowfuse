---
navTitle: Environment Variables
---

# Environment Variables

Environment Variables allow you to manage variables used in your Node-RED flows from the FlowForge application, you can read more on how to access environment variables inside Node-RED [in the Node-RED Docs](https://nodered.org/docs/user-guide/environment-variables).

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

You can create additional variables for an individual Node-RED instance by entering the name and value in the boxes at the bottom of the list and clicking the `+` button.

You can delete a variable using the trash can icon.

The image below shows an instance with 3 environment variables.

The first one `foo` is set by the template but the value `bar` is editable

The second one `locked` is set by the template and the value is set to `true` is not editable

The third one `user` is set for the instance, the value can be edited or the variable deleted

<img src="images/project-envvar.png" width="500" />

## Standard environment variables

Instances running on FlowForge are assigned a standard set environment variables as follows.

- `FF_INSTANCE_ID`
- `FF_INSTANCE_NAME`
- `FF_PROJECT_ID` (depreciated as of V1.6.0, use `FF_INSTANCE_ID` instead)
- `FF_PROJECT_NAME` (depreciated as of V1.6.0, use `FF_INSTANCE_NAME` instead)
- `FF_DEVICE_ID` (devices only)
- `FF_DEVICE_NAME` (devices only)
- `FF_DEVICE_TYPE` (devices only)

`FF_INSTANCE_ID` and `FF_INSTANCE_NAME` are assigned to the Node-RED instance running on the FlowForge server as well as all associated Devices.

Devices also have `FF_DEVICE_ID`, `FF_DEVICE_NAME` and `FF_DEVICE_TYPE` set so that flows can know where they are running.


