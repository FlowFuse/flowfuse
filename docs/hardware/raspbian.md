---
navTitle: Raspberry Pi with Raspbian
navOrder: 3
meta: 
   description: Learn how to Install and configure FlowFuse Device Agent on Raspberry Pi with Raspbian for seamless device management and automation using our step-by-step guide and installation script.
---

# Raspberry Pi

The Raspberry Pi section provides instructions for installing and setting up the FlowFuse Device Agent on your Raspberry Pi device, enabling seamless integration for efficient device management and automation.

## Installing the Device Agent

FlowFuse provides a script to install Node.JS, npm, and the FlowFuse Device Agent onto a Raspberry Pi.
This script won't work on ARMv6 builds as the standard Node.JS builds don't support it, as result Pi Zero's are not supported.

```sh
bash <(curl -sL https://raw.githubusercontent.com/FlowFuse/device-agent/main/service/raspbian-install-device-agent.sh)
```

**This script will:**

1. Detect if Node.js is already installed, it will ensure it is at least v14. If less than v14 it will stop. If nothing is found it will install the Node.js 18 LTS release 
2. Install the latest version of the FlowFuse Device Agent using npm.
3. Setup the FlowFuse Device Agent to run as a service

## Running as a service

You can run the device agent as a service, which means it can run in the background and be enabled to automatically start on boot. The install script will automatically set up the FlowFuse Device Agent to run as a service. The following commands can be useful for controlling the service or changing the default service settings.

### Starting the service on boot (optional)

If you want Node-RED to run when the device is turned on, or re-booted, you can enable the service to autostart by running the command:

```sudo systemctl enable flowfuse-device-agent.service```

To disable the service, run the command:

```sudo systemctl disable flowfuse-device-agent.service```

### Controlling the service

You can start the service with the command:

```sudo systemctl start flowfuse-device-agent```

You can check the current status with the command:

```sudo systemctl status flowfuse-device-agent```

You can stop your with the command:

```sudo systemctl stop flowfuse-device-agent```
