# FlowForge File Nodes

Projects running within FlowForge include a set of nodes that make it possible
to store files safely regardless of the environment. For edge devices the files 
are stored locally, containerized applications can read and write to persistent 
storage via API calls to a file-server instance by using these nodes.

## Nodes

There are two nodes in the File Node collection:

- `file` - A file node for writing to persistent storage
- `file in` - A file node for reading from persistent storage

## Usage

### FlowForge

The File Nodes are installed automatically with FlowForge however in order for a 
Node-RED project to use them, the built-in Node-RED file nodes must first be disabled. 
This is done by adding `10-file-js` in the **Exclude nodes by filename** 
section of your FlowForge projects settings under  the **Palette** section.

**Note**: This setting is modifiable only by a project owner and only if it has not been
locked in the [project template](concepts.md#project-template) by the platform Administrator.

### Node-RED project

Simply drop the file nodes into your flows as you would with the regular file nodes in Node-RED. 
There are some helpful built-in examples on the **Import Examples** dialog in Node-RED.

## Deployment Considerations

When a project is deployed to a device, the original Node-RED file nodes will
replace these nodes and storage will be made against the devices filesystem.

## Self-hosting

This set of nodes allow you to read and write persistent files outside of the container
only when coupled with a [file-storage](../install/file-storage/README.md) instance.
