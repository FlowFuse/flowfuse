---
navTitle: Local Stacks
meta:
   description: Configure Node-RED instances with custom memory limits and versions using Stacks in FlowFuse for local deployments.
---

# Local Stacks

A Stack defines a set of platform configuration options that will get
applied to each Node-RED instance when it is created.

For the Local deployment model, this covers two things:

 - `memory` - the value to apply (in MB) to the Node.js `max-old-space-size` option.
    This defines the point where Node.js will start freeing unused memory. It is
    not a hard limit - Node-RED's memory usage will not be capped - but this
    is useful when running on a memory constrained device such as a Raspberry Pi. Recommended minimum `256`.
 - `nodered` - the version number of Node-RED to use. This should match the value used in the steps following.

The FlowFuse installer will create a default stack using the latest stable
release of Node-RED.

The stacks are stored under `/opt/flowforge/var/stacks` or `c:\flowforge\var\stacks` on Windows.

### Creating a Stack

When a new version of Node-RED is released, it can be added to your FlowFuse
platform by creating a new stack.

For a local install there are two steps required:

1. Install a new Node-RED version

   In the FlowFuse Home directory, run the provided install script. You
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

2. Add the Stack into the FlowFuse Admin UI - see [Managing Stacks](/docs/admin/introduction/#managing-stacks).


### Development Only

If you are developing FlowFuse having checked it out from GitHub then you can run 
the following command in the repository root to install a stack:

```bash
npm run install-stack --vers=3.0.2
```

