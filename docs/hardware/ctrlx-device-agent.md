---
navTitle: ctrlX - Device Agent
navOrder: 3
meta:
   description: Learn to install and configure the FlowFuse Device Agent on ctrlX devices for seamless integration with FlowFuse, ensuring efficient device management.
  tags:
      - ctrlx
      - device agent
      - flowfuse
      - installation
      - configuration
---
# ctrlX Device Agent App

**Currently not available - will be available soon**

## Installation Procedure

1. In the ctrlX CORE web interface, navigate to the window **Settings** ➔ **Apps**.

2. Switch the ctrlX device to the **Service** mode. 

3. In the app overview, navigate to the category **Available apps**. This category displays all apps saved in the app storage on the ctrlX device and all apps provided via the ctrlX Store.

4. Search for the FlowFuse Device Agent ctrlX App to be installed and click on the Installation button. If multiple app versions are provided for installation, a list of available versions and app sources will be displayed. In this case, select the desired app version from the list to start the installation. If only one app version is provided, the installation will start directly. After the installation, the app will be shown in the app overview, under the category **Installed apps**.

5. Switch the ctrlX device back to the **Operating** mode.

## Device Agent Configuration for ctrlX

1. After successful installation, [generate and download the "Device Credentials" in FlowFuse](/docs/device-agent/register/#generating-"device-configuration")

2. In the ctrlX CORE web interface, navigate to the window **Settings** ➔ **Apps** ➔ **Manage App Data**

3. Select the folder "FlowFuse Device Agent"

4. Click on upload file and select the **device.yml** configuration from step 1

5. The Device Agent connects automatically to your FlowFuse instance. Ensure your ctrlX has a network connection to your FlowFuse platform (e.g. FlowFuse Cloud) and to the npmjs registry.
