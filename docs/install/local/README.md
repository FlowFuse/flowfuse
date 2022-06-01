# Local Install

This version of the FlowForge platform is intended for running on a single machine
for a smaller deployment (e.g. evaluation or home user).

### Prerequisites

#### Operating System

The install script has been tested against the following operating systems:

 - Raspbian/Raspberry Pi OS versions Buster/Bullseye [^1]
 - Debian Buster/Bullseye
 - Fedora 35
 - Ubuntu 20.04
 - CentOS 8/RHEL 8/Amazon Linux 2
 - MacOS Big Sur
 - Windows 10

[^1]: Arm6 devices, such as the original Raspberry Pi Zero and Zero W are not supported.

#### Node.js

FlowForge requires ***Node.js v16***.

##### Linux

The install script will check to see if it can find a suitable version of Node.js.
If not, it will offer to install it for you.

It will also ensure you have the appropriate build tools installed that are often
needed by Node.js modules to build native components.

##### Windows/MacOS

If the install script cannot find a suitable version of Node.js, it will exit.

You will need to manually install it before proceeding. Information about
how to do this can be found on the Node.js website here:

[https://nodejs.org/en/download](https://nodejs.org/en/download)

You will also need to install the appropriate build tools.

On Windows, the standard Node.js installer will offer to do that for you.

On MacOS, you will need the `XCode Command Line Tools` to be installed. This can
be done by running the following command:

```
xcode-select --install
```

### Installing FlowForge

1. Create a directory to be the base of your FlowForge install. For example: `/opt/flowforge` or `c:\flowforge`

   For Linux/MacOS:
    ```
    sudo mkdir /opt/flowforge
    sudo chown $USER /opt/flowforge
    ```
   
   For Windows:
    ```
    mkdir c:\flowforge
    ```

2. Download the Installer zip file from https://github.com/flowforge/installer/releases

3. Unzip the downloaded file into a temporary location and copy its contents to
   the FlowForge directory

   For Linux/MacOS:
    ```
    cd /tmp/
    unzip flowforge-installer-x.y.z.zip
    cp -R flowforge-installer-x.y.z/* /opt/flowforge
    ```

   For Windows:
    ```
    cd c:\temp
    tar -xf flowforge-installer-x.y.z.zip
    xcopy /E /I flowforge-installer-x.y.z c:\flowforge
    ```

4. Run the installer and follow the prompts

   For Linux/MacOS:
    ```
    cd /opt/flowforge
    ./install.sh
    ```

   For Windows:
    ```
    cd c:\flowforge
    install.bat
    ```

#### Installing as a service

On Linux, the installer will ask if you want to run FlowForge as a service.
This will mean it starts automatically whenever you restart your device.

If you select this option, it will ask if you want to run the service as the
current user, or create a new `flowforge` user. If you choose to create the
user, it will also change the ownership of the FlowForge directory to that user.


### Configuring FlowForge

The default FlowForge configuration is provided in the file `/opt/flowforge/etc/flowforge.yml`.

For more details on the options available, see the [configuration guide](../configuration.md).


### Running FlowForge

If you have installed FlowForge as a service, it can be started by running:

```
service flowforge start
```

To run it manually, you can use:

 - Linux/MacOS:
    ```
    /opt/flowforge/bin/flowforge.sh
    ```

 - Windows:

   Use the file `bin/flowforge.bat` in the FlowForge directory

### First Run Setup

Once FlowForge is started, you can access the platform in your browser at [http://localhost:3000](http://localhost:3000).

The first time you access it, the platform will take you through creating an
administrator for the platform and other configuration options.

For more information, follow [this guide](../first-run.md).

### Upgrade

To upgrade to v0.3 you can follow these steps.

 1. Stop FlowForge `sudo service flowforge stop` [^2]
 2. `cd /opt/flowforge/app`
 3. `sudo -u flowforge npm install @flowforge/flowforge@0.3.0` [^3]
 4. Use the editor of your choice to update `/opt/flowforge/etc/flowforge.yml` to add `host: 0.0.0.0`  (if you need to access from other than localhost)
 5. Restart FlowForge `sudo service flowforge start` [^2]
 
You will then need to create a Project Stack and Project Template before you can
create any more projects. See [this guide](../first-run.md#next-steps) for more information.


If you are running as your normal user you can drop the `sudo -u flowforge` and just run `npm install @flowforge/flowforge@0.2.0`

---

[^2]: Assumes you are running Flowforge as a Linux service.
[^3]: Assumes you are running Flowforge as the `flowforge` user as created by the installer
