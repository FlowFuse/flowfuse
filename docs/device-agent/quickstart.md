---
navTitle: Quick Start
navOrder: 2
---

# Developing Flows on Your Device

## Add Device to FlowFuse

### Install Device Agent Software

1. Open a Terminal/Command Prompt as an root/administrative user
2. Run the following commands in sequence:

Windows:
```bash
mkdir c:\opt\flowfuse-device
cd c:\opt\flowfuse-device
npm install -g @flowfuse/device-agent
flowfuse-device-agent --ui --ui-user admin --ui-pass password --ui-port 8081
```
Linux/MacOS:
```bash
mkdir /opt/flowfuse-device
cd /opt/flowfuse-device
npm install -g @flowfuse/device-agent
flowfuse-device-agent --ui --ui-user admin --ui-pass password --ui-port 8081
```

Note: The flags used in the command above have the following meanings:
- `--ui`: Start the device agents web-based user interface.
- `--ui-user`: Specify the username for the web user interface.
- `--ui-pass`: Specify the password for the web user interface.
- `--ui-port`: Specify the port for the web user interface.
- You can find more details about these flags [here](https://flowfuse.com/docs/device-agent/running/).

### Add Device in FlowFuse
1. Open your web browser and go to your FlowFuse application page.
2. Navigate to the **Devices** section.
3. Click **Add Device.**
4. Fill in the **Device Name** and **Device Type,** then click **Add.**

<img src="images/add_device.png" width=500 />

### Configure Device Agent
1. Expand the Manual setup section, click the **Copy** button below the **Device Configuration**.

<img src="images/config_yml2.png" width=500 />

2. Open a new browser tab and navigate to the IP address of the device using the port defined when starting up the device agent.  **\<\<ip of device>>:\<\<port>>**, e.g., localhost:8081
3. Paste the copied device configuration into the **Agent Configuration** field. This configuration contains vital information instructing the device on how to communicate with FlowFuse. It's crucial to keep this information secure and not share it with unauthorized individuals.

<img src="images/device_gui.png" width=500 />

4. Click `Apply.`

### Link Device to Application
1. Return to the **Devices** section in your FlowFuse application page.
2. Locate your newly added device and click its menu.

<img src="images/addtoapp.png" width=500 />

3. Choose to add the device to your application and click **Add.**

<img src="images/addtodevice.png" width=500 />

## Develop on Device
### Enable Developer Mode
1. Navigate to **Applications** and select the application your device was added to.
2. Go to the **Devices** tab within the application.
3. Locate your newly added device and **click** on your device.
4. Then Click **Enable Developer Mode.**

<img src="images/developer.png" width=200 />

5. Under the **Developer Mode** settings, click **Enable** for **Editor Access.**

<img src="images/developerMode.png" width=500 />

6. Access has now been granted to edit the Node-RED instance.

<img src="images/editorEnabled.png" width=200 />

7. Clicking Device Editor will navigate you to a window for edits to your Node-Red instance.

<img src="images/nr_editor.png" width=500 />


## Snapshots
### Take Device Snapshot
1. Navigate to Devices Menu.
2. Select device that you would like to take a snapshot of.

<img src="images/snapshotMenu.png" width=500 />

3. Select **Create Snapshot.**
4. Enter **Name** and **Description** if desired.

<img src="images/snapshotCreate.png" width=500 />

5. Click **Create.**

### Restore Device from Snapshot
1. Navigate to Devices Menu.
2. Select the Device needing to be restored.
3. Navigate to Snapshots menu.

<img src="images/deploySnapshot.png" width=500 />


4. Hover over the Snapshot desired to be restored from and select **Deploy Snapshot.**

<img src="images/confirmSnapshot.png" width=500 />

5. Select **Confirm.**
