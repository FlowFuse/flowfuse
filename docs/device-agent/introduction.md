---
navOrder: 1
---
# FlowForge Device Agent

The FlowForge platform can be used to manage Node-RED instances running on remote Devices.
A Device runs a software agent that connects back to FlowForge in order to receive updates.

In order to connect your device to FlowForge, and to allow FlowForge to manage it, you'll need to do the following steps:

- [Install the FlowForge Device Agent](./install.md) - Install the agent directly onto your device.
- [Register your Device](./register.md) - Let FlowForge know your device has been setup with the Device Agent.
- [Run the Device Agent](./running.md) - Run the agent on your device, this will connect to FlowForge and wait for instruction on which Node-RED flows to run.
- [Deploy Flows to your Device](./deploy.md) - With the above steps completed, you can now run Node-RED flows directly on your device, and have them managed by FlowForge remotely.