# Local Install

This version of the FlowForge platform is intended for running on a single machine
for a smaller deployment (e.g. evaluation or home user).

## Prerequisites

### Operating System

The install script has been tested against the following operating systems:

 - Raspbian/Raspberry Pi OS versions Buster/Bullseye [^1]
 - Debian Buster/Bullseye
 - Fedora 35
 - Ubuntu 20.04
 - CentOS 8/RHEL 8/Amazon Linux 2
 - MacOS Big Sur & Monterey on Intel & Apple M processors
 - Windows 10 & 11

[^1]: Arm6 devices, such as the original Raspberry Pi Zero and Zero W are not supported.

### Node.js

FlowForge requires ***Node.js v16***.

#### Linux

The install script will check to see if it can find a suitable version of Node.js.
If not, it will offer to install it for you.

It will also ensure you have the appropriate build tools installed that are often
needed by Node.js modules to build native components.

#### Windows/MacOS

If the install script cannot find a suitable version of Node.js, it will exit.

You will need to manually install it before proceeding. Information about
how to do this can be found on the Node.js website here: [https://nodejs.org/en/download](https://nodejs.org/en/download)

You will also need to install the appropriate build tools.

* **Windows**: the standard Node.js installer will offer to do that for you.
* **MacOS**: you will need the `XCode Command Line Tools` to be installed. 
  This can be done by running the following command:
    ```bash
    xcode-select --install
    ```

## Installing FlowForge

1. Create a directory to be the base of your FlowForge install. For example: `/opt/flowforge` or `c:\flowforge`

   For Linux/MacOS:
    ```bash
    sudo mkdir /opt/flowforge
    sudo chown $USER /opt/flowforge
    ```
   
   For Windows:
    ```bash
    mkdir c:\flowforge
    ```

2. Download the latest [Installer zip file](https://github.com/flowforge/installer/releases/latest/download/flowforge-installer.zip) into a temporary location.


3. Unzip the downloaded zip file and copy its contents to
   the FlowForge directory

   ### For Linux/MacOS: 
   _Assumes `/tmp/` is the directory where you downloaded `flowforge-installer.zip`_
    ```bash
    cd /tmp/
    unzip flowforge-installer.zip
    cp -R flowforge-installer/* /opt/flowforge
    ```
    

   ### For Windows:
   _Assumes `c:\temp` is the directory where you downloaded `flowforge-installer.zip`_
    ```bash
    cd c:\temp
    tar -xf flowforge-installer.zip
    xcopy /E /I flowforge-installer c:\flowforge
    ```
    


4. Run the installer and follow the prompts

   For Linux/MacOS:
    ```bash
    cd /opt/flowforge
    ./install.sh
    ```

   For Windows:
    ```bash
    cd c:\flowforge
    install.bat
    ```


### Installing as a service (optional)

On Linux, the installer will ask if you want to run FlowForge as a service.
This will mean it starts automatically whenever you restart your device.

If you select this option, it will ask if you want to run the service as the
current user, or create a new `flowforge` user. If you choose to create the
user, it will also change the ownership of the FlowForge directory to that user.

## Configuring FlowForge

The default FlowForge configuration is provided in the file `flowforge.yml`
* Linux/MacOS: `/opt/flowforge/etc/flowforge.yml`
* Windows: `c:\flowforge\etc\flowforge.yml`

The default configuration file already contains everything you need to get started with FlowForge.

It will allow you to access FlowForge and the projects you create, from the same server running the platform. 
If you want to allow access from other devices on the network, you must edit the configuration file and 
change the `host` setting to `0.0.0.0` and change `base_url` to contain the IP address of the server.

NOTE: We do not support changing the `host` and `base_url` values once you have created a project.
For more information on all of the options available, see the [configuration guide](../configuration.md).


## Running FlowForge

To run it manually, you can use:

 - Linux/MacOS:
    ```bash
    /opt/flowforge/bin/flowforge.sh
    ```

 - Windows:
    ```bash
    c:\flowforge\bin\flowforge.bat
    ```

Or to run as a service:

 - Linux
 
    ```bash
    service flowforge start
    ```
## First Run Setup

Once FlowForge is started, you can access the platform in your browser at [http://localhost:3000](http://localhost:3000).

The first time you access it, the platform will take you through creating an
administrator for the platform and other configuration options.

For more information, follow [this guide](../first-run.md).

## Setting up Mosquitto (optional)

The platform depends on the [Mosquitto MQTT Broker](https://mosquitto.org/) to
provide real-time messaging between devices and the platform.

This is currently an *optional* component - the platform will work without the
broker, but some features will not be available.

We do **not** support sharing a broker with other non-FlowForge applications. If you
already have mosquitto installed and running, you will need to run a second instance
dedicated to FlowForge.

You can either follow the manual install steps, which involve building the authentication
plugin from scratch, or make use of the [Docker install](#docker-install).

### Manual install

**Note**: if you are running on Windows, you will need to follow the [Docker install](#docker-install)
instructions below due to a limitation of the authentication plugin we use.

Follow the appropriate [install instructions](https://mosquitto.org/download/) for
your operating system.

Once installed, you will need to build and install the authentication plugin.

1. Clone the plugin repository
    ```bash
    git clone https://github.com/iegomez/mosquitto-go-auth.git
    ```

2. Follow the instructions on [building the plugin](https://github.com/iegomez/mosquitto-go-auth#building-the-plugin)

3. This should result in a file called `go-auth.so` being generated

4. ([Optional](#setting-up-mosquitto-optional)) Run mosquitto with the configuration file found in the `broker` directory

   You will need to customise the values to match your local configuration:
      - `auth_plugin` - set to the path of the `go-auth.so` file built in the previous step
      - `listener 1883/1884` - if you already have mosquitto running locally, you'll need to
        change these ports to something else.
      - `auth_opt_http_host` / `auth_opt_http_port` - if you plan to run the platform
        on a different port, change these settings to match.

    ```bash
    mosquitto -c broker/mosquitto.conf
    ```

### Docker Install

Instead of installing and building mosquitto and the authentication plugin from source,
you can use a pre-built docker image that provides everything needed.

1. First pull the latest version of the pre-built container
    ```bash
    docker pull iegomez/mosquitto-go-auth
    ```

2. ([Optional](#setting-up-mosquitto-optional)) A default mosquitto.conf file can be found in the `broker` directory.

    You will need to customise the values to match your local configuration:
     - `auth_opt_http_host` value to match the IP address of either the docker0 interface or the external IP address of the machine running the Forge platform
     - `auth_opt_http_port` if you have changed the port the Forge platform is running on

3. Start the container with the following command
    ```bash
    docker run -d -v /full/path/to/mosquitto.conf:/etc/mosquitto/mosquitto.conf -p 1883:1883 -p 1884:1884 --name flowforge-broker iegomez/mosquitto-go-auth
    ```

    This will map the `1883`/`1884` ports to the host machine so they can be accessed outside of the container. If you already have an MQTT broker running on port 1883, then you'll need to modify the `-p` options to use a different set of ports. For example: `-p 9883:1883 -p 9884:1884`.


## Upgrade

To upgrade to the latest release you can follow these steps. Replace `x.y.z` with the
version you are upgrading to.

 1. Stop FlowForge `sudo service flowforge stop` [^2]
 2. Change into the `app` directory
    * `cd /opt/flowforge/app` (Linux/MacOS)
    * `cd c:\flowforge\app` (Windows)
 3. NPM install the desired version
    * `sudo -u flowforge npm install @flowforge/flowforge@x.y.z` (Linux/MacOS) [^3]
    * `npm install @flowforge/flowforge@x.y.z` (Windows)
 4. Check the release notes for any additional steps needed to upgrade the particular version
 5. Restart FlowForge `sudo service flowforge start` [^2]
 
If you are running as your normal user you can drop the `sudo -u flowforge` and just run `npm install @flowforge/flowforge@x.y.z`

[^2]: Assumes you are running Flowforge as a Linux service.
[^3]: Assumes you are running Flowforge as the `flowforge` user as created by the installer
