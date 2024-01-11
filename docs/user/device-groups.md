---
navTitle: Device Groups
---

# Device Groups


**Navigation**: `Team > Application > Device Groups`

Device groups allow you to organise your Application assigned devices into logical groups.
These groups can be the target of [DevOps Pipelines](./devops-pipelines.md), greatly
simplifying deployments to one or hundreds of devices.

The following requirements apply:

 - FlowFuse 1.15+ running with an EE license
 - FlowFuse Cloud

## Creating a Device Group

Before starting, ensure you have 2 or more devices assigned to your application.
You can find out how to do that [here](../device-agent/register.md#assign-the-device-to-an-application)

1. Select the Application you want to configure a Device Group for.
1. Select the "Device Groups" tab
1. Click "Add Device Group"
1. Name your Device Group appropriately (this can be changed later)
1. Click "Create"

_Note: Adding a description can help you better distinguish device groups._

## Updating Device Group Membership

1. In the Device Groups table, click the Device Group you want to modify
1. Click "Edit"
   1. On the left, you will be shown available devices (ones that are assigned to your application and are available to be added to a device group)
   1. On the right, you will be shown devices that are already in the device group
1. Place a checkmark next to the devices in the Available Devices list that you want to add to the Device Group then click "Add Devices"
1. Place a checkmark next to the devices in the Device Group list that you want to remove then click "Remove Devices"
1. Click "Save" to commit your changes

_Note: If you make a mistake, you can cancel your changes at any time by clicking "Cancel"_
_Note: When a device you want to add to a group doesn't appear in the list, it's likely already assigned to another group._
