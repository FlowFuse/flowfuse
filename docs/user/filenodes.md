# FlowForge File Nodes

Projects running within FlowForge include a set of nodes that make it possible
to store files safely regardless of the environment. For edge devices the files 
are stored locally, containerized applications can read and write to persistent 
storage via API calls to a file-server instance by using these nodes.

*NOTE: This set of nodes allow you to read and write persistent files in a containerised
environment only when coupled with a [file-storage](../install/file-storage/README.md) instance*


## Nodes

There are two nodes in the File Node collection:

- `file` - A file node for writing to persistent storage
- `file in` - A file node for reading from persistent storage

## Install

### FlowForge

The File Nodes are installed automatically with FlowForge however in order for a 
project to use them, the built-in Node-RED file nodes must first be disabled. 
This is done by simply adding `10-file-js` in the **Exclude nodes by filename** 
section of your FlowForge projects settings under  the **Palette** section

Note: FlowForge projects settings are only  by Administrators and made available to the teams and users of the platform.

### Standalone Node-RED

These nodes can be installed on the command-line:

```bash
cd ~/.node-red
npm install @flowforge/nr-file-nodes
```

This assumes the default location of the Node-RED user directory. If you are not
sure where that is, check the log output when Node-RED starts as it will log the
full path to the `User directory`.

In order for a project to use them, the built-in Node-RED file nodes must first be disabled. 
This is done by editing your Node-RED settings file and adding an entry to the 
`nodesExcludes` array. Please refer to the [Node-RED User Guide](https://nodered.org/docs/user-guide/) 
for information on the Node-RED settings file.

## Usage

Once the File Nodes are installed you simply use them in your flows as you would
use the regular file nodes in Node-RED. There are some helpful built-in examples
on the **Import Examples** dialog in Node-RED.

## Deployment Considerations

When a project is deployed to a device, the original Node-RED file nodes will
replace these nodes and storage will be made against the devices filesystem
