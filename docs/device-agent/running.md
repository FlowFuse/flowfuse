---
navTitle: Running the Agent
navOrder: 5
---

# Running the Device Agent

## Running

If the agent was installed as a global npm module, the command `flowfuse-device-agent` will be on the path.

If the default working directory and config file are being used, then the agent can be started with:

```bash
flowfuse-device-agent
```

By default Node-RED will listen to port `1880`, you can change there using the options
detailed [here](./install.md#listen-port).

This will start the agent, set the device in the default of fleet mode, and connect to
FlowForge, waiting until a Target Snapshot has been assigned to it or it is assigned
to an Application.

### When assigned to an instance:
Once the agent has been assigned a Target Snapshot, it will download the Snapshot and
deploy it to the device.

### When assigned to an application:
Once the agent has been assigned to an application it start up. If the device is new, 
it will get a default set of flows which can be edited directly. 
See [Editing the Node-RED flows on a device that is assigned to an application](./deploy.md#editing-the-node-red-flows-on-a-device-that-is-assigned-to-an-application) for details.

### Device Agent Command Line Options

The following command line options are available:

```
Options

  -c, --config file     Device configuration file. Default: device.yml
  -d, --dir dir         Where the agent should store its state. Default: /opt/flowfuse-device
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

Setup command

  -o, --otc string   Setup device using a one time code
  -u, --ff-url url   URL of FlowFuse. Required for setup

Global Options

  -h, --help       print out helpful usage information
  --version        print out version information
  -v, --verbose    turn on debugging output
```

### Command Line Examples

_Start the agent with a different port number_

```bash
flowfuse-device-agent -p 8080
```

_Start the agent with a different working directory and the Web UI enabled_

```bash
flowfuse-device-agent -d /path/to/working/directory -w --ui-user admin --ui-pass password --ui-port 8081
```

## Running with no access to npmjs.org

By default the Device Agent will try and download the correct version of Node-RED and 
any nodes required to run the Snapshot that is assigned to run on the device.

If the device is being run on an offline network or security policies prevent the 
Device Agent from connecting to npmjs.org then it can be configured to use a pre-cached 
set of modules.

You can enable this mode by adding `-m` to the command line or adding `moduleCache: true` 
to the `device.yml` file. This will cause the Device Agent to load the modules from the 
`module_cache` directory in the Device Agents [Working Directory](./install.md#working-directory) (or whatever is set
with the `-d` option) (e.g. `/opt/flowfuse-device/module_cache`.).

### Creating a module cache

To create a suitable module cache, the device must be assigned to an instance.  You will need to
install the modules on a local device with access to npmjs.org, ensuring you use the same
OS and Architecture as your target device, and then copy the modules on to your device.

1. From the Snapshot page, select the snapshot you want to deploy and select the option to download its `package.json` file.
2. Place this file in an empty directory on your local device.
3. Run `npm install` to install the modules. This will create a `node_modules` directory.
4. On your target device, create a directory called `module_cache` inside the Device Agent Configuration directory.
5. Copy the `node_modules` directory from your local device to the target device so that it is under the `module_cache` directory.
