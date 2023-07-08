---
navTitle: Running the Agent
navOrder: 4
---

# Running the Device Agent

## Running

If the agent was installed as a global npm module, the command `flowforge-device-agent` will be on the path.

If the default working directory and config file are being used, then the agent can be started with:

```bash
flowforge-device-agent
```

By default Node-RED will listen to port `1880`, you can change there using the options
detailed [here](./install.md#listen-port).

This will start the agent, and connect to FlowForge, waiting until a Target Snapshot
has been assigned to it.

Once the agent has been assigned a Target Snapshot, it will download the Snapshot and
deploy it to the device.

### Device Agent Command Line Options

The following command line options are available:

```
Options

  -c, --config file     Device configuration file. Default: device.yml
  -d, --dir dir         Where the agent should store its state. Default: /opt/flowforge-device 
  -i, --interval secs
  -p, --port number
  -m, --moduleCache     Use local npm module cache rather than install

Web UI Options

  -w, --ui            Start the Web UI Server (optional, does not run by default)       
  --ui-host string    Web UI server host. Default: (0.0.0.0) (listen on all interfaces) 
  --ui-port number    Web UI server port. Default: 1879
  --ui-user string    Web UI username. Required if --ui is specified
  --ui-pass string    Web UI password. Required if --ui is specified
  --ui-runtime mins   Time the Web UI server is permitted to run. Default: 10

Global Options

  -h, --help       print out helpful usage information 
  --version        print out version information       
  -v, --verbose    turn on debugging output
```

### Command Line Examples

_Start the agent with a different port number_

```bash
flowforge-device-agent -p 8080
```

_Start the agent with a different working directory and the Web UI enabled_

```bash
flowforge-device-agent -d /path/to/working/directory -w --ui-user admin --ui-pass password --ui-port 8081
```

## Running with no access to npmjs.org

By default the Device Agent will try and download the correct version of Node-RED and 
any nodes required to run the Snapshot that is assigned to run on the device.

If the device is being run on an offline network or security policies prevent the 
Device Agent from connecting to npmjs.org then it can be configured to use a pre-cached 
set of modules.

You can enable this mode by adding `-m` to the command line adding `moduleCache: true` 
to the `device.yml` file. This will cause the Device Agent to load the modules from the 
`module_cache` directory in the Device Agents [Working Directory](./install.md#working-directory) (or whatever is set
with the `-d` option) (e.g. `/opt/flowforge-device/module_cache`.).

### Creating a module cache

To create a suitable module cache, you will need to install the modules on a local device with
access to npmjs.org, ensuring you use the same OS and Architecture as your target
device, and then copy the modules on to your device.

1. From the Snapshot page, select the snapshot you want to deploy and select the option to download its `package.json` file.
2. Place this file in an empty directory on your local device.
3. Run `npm install` to install the modules. This will create a `node_modules` directory.
4. On your target device, create a directory called `module_cache` inside the Device Agent Configuration directory.
5. Copy the `node_modules` directory from your local device to the target device so that it is under the `module_cache` directory.

<br>

[^global-install]: Starting the agent via the command `flowforge-device-agent` assumes it was installed as a global npm module and your path is properly configured to pick that up.

## Running the device agent as a service on a Raspberry Pi

Can can run the device agent as a service, this means it can run in the background and be enabled to automatically start on boot.

### Creating a Service File

The first step is creating the systemd unit file for your service. You can start by creating a new file in the /etc/systemd/system directory with a .service file extension:

```sudo nano /etc/systemd/system/flowforge-device-agent.service```

The recommended content for the service file can be found here [this Github page](https://github.com/flowforge/flowforge-device-agent/blob/main/service/flowforge-device.service).

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