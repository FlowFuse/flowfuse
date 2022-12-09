# Local Project Stacks

A Project Stack defines a set of platform configuration options that will get
applied to each project when it is created.

For the Local deployment model, this covers two things:

 - `memory` - the value to apply (in MB) to the Node.js `max-old-space-size` option.
    This defines the point where Node.js will start freeing unused memory. It is
    not a hard limit - the project's memory usage will not be capped - but this
    is useful when running on a memory constrained device such as a Raspberry Pi. Recommended minimum `256`.
 - `nodered` - the version number of Node-RED to use. This should match the value used in the steps following.

The FlowForge installer will create a default stack using the latest stable
release of Node-RED.

The stacks are stored under `/opt/flowforge/var/stacks` or `c:\flowforge\var\stacks` on Windows.

### Creating a Stack

When a new version of Node-RED is released, it can be added to your FlowForge
platform by creating a new stack.

For a local install there are two steps required:

1. Install a new Node-RED version

   In the FlowForge Home directory, run the provided install script. You
   must provide the full Node-RED version number, eg `3.0.2`, or use `latest` to install the most recent stable version.

   Linux/Mac:
   ```bash
   cd /opt/flowforge
   ./bin/ff-install-stack.sh 3.0.2
   ```

   Windows
   ```bash
   cd c:\flowforge
   bin\ff-install-stack.bat 3.0.2
   ```

2. Creating the Stack

   Log into the FlowForge platform as an administrator. Navigate to the
   Admin Settings -> Stacks section.

   If this new stack should be offered as a direct upgrade of an existing stack, select the 'Create new version' option from the dropdown menu
   of the stack you want to replace. Projects that use the old stack
   will offer the new stack as a one-click upgrade option.

   Alternatively, click 'Create stack' to create an entirely new stack.

   When prompted for the Node-RED version, provide the exact version that was installed. For example, if you ran the script with `latest` and it resulted in `3.0.2` being installed, you should enter `3.0.2`. This must
   match the directory name created in your `stacks` directory.


### Development Only

If you are developing FlowForge having checked it out from GitHub then you can run 
the following command in the project root to install a stack:

```bash
npm run install-stack --vers=3.0.2
```

