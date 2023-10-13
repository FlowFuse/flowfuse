---
navTitle: Raspberry Pi with Raspbian
navOrder: 3
---
# Raspberry Pi

The Raspberry Pi section provides instructions for installing and setting up the FlowFuse Device Agent on your Raspberry Pi device, enabling seamless integration for efficient device management and automation.
## Installing the Device Agent

We provide a script to install Node.js, npm and the FlowFuse Device Agent onto a Raspberry Pi. This script won't work on ARMv6 builds as the standard Node.js builds don't support it, as result Pi Zero's are not supported.


```sh
bash <(curl -sL https://raw.githubusercontent.com/FlowFuse/device-agent/main/service/raspbian-install-device-agent.sh)
```

**This script will:**

1. Detect if Node.js is already installed, it will ensure it is at least v14. If less than v14 it will stop. If nothing is found it will install the Node.js 18 LTS release 
2. Install the latest version of the FlowFuse Device Agent using npm.
3. Setup the FlowFuse Device Agent to run as a service

## Running as a service

You can run the device agent as a service, this means it can run in the background and be enabled to automatically start on boot.

### Creating a Service File

The first step is creating the systemd unit file for your service. You can start by creating a new file in the /etc/systemd/system directory with a .service file extension:

```sudo nano /etc/systemd/system/flowforge-device-agent.service```

The recommended content for the service file can be found here [this Github page](https://github.com/FlowFuse/device-agent/blob/main/service/flowforge-device.service).

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