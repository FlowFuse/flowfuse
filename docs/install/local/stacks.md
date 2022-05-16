# Local Project Stacks

A Project Stack defines a set of platform configuration options that will get
applied to each project when it is created.

For the Local deployment model, this covers two things:

 - `memory` - the value to apply (in MB) to the Node.js `max-old-space-size` option.
    This defines the point where Node.js will start freeing unused memory. It is
    not a hard limit - the project's memory usage will not be capped - but this
    is useful when running on a memory constrained device such as a Raspberry Pi. Recomended minium `256`.
 - `nodered` - the version number of Node-RED to use. This shold match the value used in the steps following.

## Upgrading Node-RED

By default, FlowForge 0.3 will use Node-RED 2.2.x - which is installed when
FlowForge is installed.

As new versions of Node-RED are released, the following steps can be used to
make them available within FlowForge.

### Development

If you are developing FlowForge having checked it out from GitHub then you can run 
the following command in the project root

```bash
npm run install-stack --vers=2.2.2
```

### Production

If you are running a version from the installer then you can run the following 
commands where `bin` is in the FlowForge Home directory 
(e.g. `/opt/flowforge`)

Linux/Mac
```
bin/install-stack.sh 2.2.2
```

Windows:
```
bin\install-stack.bat 2.2.2
```

These scripts will automate the following steps

1. In the `var` directory in your FlowForge home directory, create a directory
   called `stacks`
2. In the `var/stacks` directory create a directory called `2.2.2`
3. In the `var/stacks/2.2.2` directory run `npm install --prefix . node-red@2.2.2`
4. Create a new Stack under the Admin Settings section of the FlowForge web console.
   1. Enter `2.2.2` under the Node-RED version - this *must* match the directory
      name created under `var/stacks`.

At this point, new projects can select the new Stack in order to use the new version
of Node-RED.

*Note:* with the 0.3 release, it is *not* possible to change the Stack being used
by a project. That will come in a future release.
