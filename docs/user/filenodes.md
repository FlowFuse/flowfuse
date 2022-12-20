# FlowForge File Nodes

Projects running within FlowForge include a set of nodes that make it possible
to store files safely regardless of the environment. 
Cloud based projects can read and write to persistent storage using these nodes.
Edge devices will store files on its local filesystem.

## Enabling Persistent File Storage

FlowForge file nodes replace the core Node-RED file nodes. To make use of these
nodes, the FlowForge platform Administrator must ensure the core file nodes are 
not loaded.

This is done by adding `10-file-js` in the **Exclude nodes by filename** 
section of your FlowForge projects settings under  the **Palette** section.

This setting is modifiable only by a project owner and only if it has not been
locked in the [project template](concepts.md#project-template) by the platform Administrator.

These nodes are enabled by default on the FlowForge cloud platform.

## Nodes

There are two nodes in the File Node collection:

- `file` - A file node for writing to persistent storage
- `file in` - A file node for reading from persistent storage

## Usage

Simply drop the file nodes into your flows as you would with the regular file nodes in Node-RED. 
There are some helpful built-in examples on the **Import Examples** dialog in Node-RED.

## Deployment Considerations

When a project is deployed to a device, the original Node-RED file be used and storage will be
made against the devices local filesystem.
