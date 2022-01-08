# Installing FlowForge

## LocalFS Install

This version of the FlowForge platform is intended for running on a single machine for a smaller deployment (e.g. evaluation or home user)

### Prerequistes

The FlowForge platform requires the NodeJS runtime at v16 or newer. On Windows or OSx you will need to manually install this before proceeding. Information about how to do this can be found on the NodeJS website here:

[https://nodejs.org/en/download](https://nodejs.org/en/download)

When installing please remember to install the native build tools when prompted by the Windows installer as this will be required both by the FlowForge platform, but also by Node-RED and some of it's nodes.

On OSx the `XCode Command Line Tools` will need to be installed. This can be done by running the following command `xcode-select --install`

For Linux systems the install script will prompt you to install a suitable version if it can not find one to use on the system.

The install scripts have been tested on the following platforms:

 - Raspbian/Raspberry Pi OS versions Buster/Bullseye ~
 - Debian Buster/Bullseye
 - Fedora 35
 - Ubuntu 20.04
 - CentOS 8/RHEL 8/Amzon Linux 2
 - OSx Catalina
 - Windows 10

~ Not supporting Arm6 based machines (e.g. Raspberry Pi Z) as NodeJS installer no longer supports this platform. 

FlowForge also makes use of the SQLite3 library for storing state, if the installer finds a suitable version on the system it will make use of this, otherwise it try and download a prebuilt version to use and as a final step will build and statically link against version built from source. This is one of the reasons that the native build tools are required.

### Install

 - Create a directory to be the home of your FlowForge install e.g. `/opt/flowforge`
 - Download the Installer zip file (link)
 - Unzip the file into the FlowForge home directory
 - From within the FlowForge home directory run either `./install.sh` or `install.bat`
 - If prompted say yes to installing NodeJS
 - On Linux you will be asked if you want to run FlowForge as a service, if you answer yes:
   - Decide if you want to run the sevice as the current user or as a new `flowforge` user
   - Once complete you can start the service with `service flowforge start`
 - If you answer no to the service or are running on OSx or Windows then:
   - Once the install completes you can start the FlowForge platform with `./flowforge.sh` or `flowforge.bat`


### Configuration

Most configuration is done via the web interface. The following values can be changed in the `.env.development` file in the FlowForge home directory.

- `PORT` Which port to the FlowForge platform should listen on. default `3000`
- `BASE_URL` The URL to access the FlowForge platform. default `http://localhost:3000`
- `LOCALFS_ROOT` Where to store the userDir directories for the Node-RED instances. default `localfs_root` in the FlowForge home directory
- `LOCALFS_START_PORT` The port number to start from for Node-RED instances. default `7880`
- `LOCALFS_NODE_PATH` The path to the node binary to use for starting Node-RED instances. Sometimes needed when using nvm. default not set
- `SMTP_TRANSPORT_HOST` The hostname for a SMTP server to be used to send email. default not set (email disabled)
- `SMTP_TRANSPORT_PORT` The port for the SMTP server to be used to send email. default not set
- `SMTP_TRANSPORT_TLS` To use TLS when connecting to SMTP server. default `false`
- `SMTP_TRANSPORT_AUTH_USER` A username to authenticate with the SMTP server
- `SMTP_TRANSPORT_AUTH_PASS` A passsword to authenticate with the SMTP server

### First Run

You can access the FlowForge platform on [http://localhost:3000](http://localhost:3000) 

Instructions on how to configure FlowForge on the first run can be found [here](../admin/README.md)

### Issues

If you come across any issues please raise them here: [https://github.com/flowforge/flowforge/issues](https://github.com/flowforge/flowforge/issues)