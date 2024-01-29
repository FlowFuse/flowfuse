---
navTitle: FlowFuse File Nodes
---

# FlowFuse File Nodes

Node-RED instances running within FlowFuse include a set of nodes that make it possible
to store files safely regardless of the environment. 
Cloud based instances can read and write to persistent storage using these nodes.
Edge devices will store files on its local filesystem.

There are two nodes in the File Node collection:

- `file` - A file node for writing to persistent storage
- `file in` - A file node for reading from persistent storage

## Usage

Simply drop the file nodes into your flows as you would with the regular file nodes in Node-RED. 

**Example:** Write string to a file, then read from the file
<iframe width="100%" height="100%" src="https://flows.nodered.org/flow/7f93fbbf67f9dc4e81bfbeb2b921881e/share" allow="clipboard-read; clipboard-write" style="border: none;"></iframe>

There are more helpful built-in examples on the **Import Examples** dialog in Node-RED.

## Deployment Considerations

When a snapshot is deployed to a device, the original Node-RED file nodes are used and 
any files will be stored on the device's local filesystem.

