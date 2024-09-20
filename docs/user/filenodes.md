---
navTitle: FlowFuse File Nodes
---

# FlowFuse File Nodes

Node-RED instances running within FlowFuse Cloud with Launcher version before 2.7.0
include a modified set of nodes that make it possible to store files safely regardless of 
the environment. 
Cloud based instances can read and write to persistent storage using these nodes.
Edge devices will store files on its local filesystem.

There are two nodes in the File Node collection:

- `file` - A file node for writing to persistent storage
- `file in` - A file node for reading from persistent storage

## FlowFuse 2.7.0 and later

With the release of FlowFuse v2.7.0 a new Persistent Storage feature was enabled.

This allows the default Node-RED File Nodes to work safely by mounting a volume to 
ensure files are persisted across all restarts of the Instance.

On Docker, Kubernetes self hosted instances and FlowFuse Cloud the volume is mounted
on `/data/storage`. The Current Working Directory for the Node-RED process is set to 
this directory, this means that if you do not specify a path in a node it will created 
or read from this directory.

For LocalFS builds a `storage` directory is created in the Instance User Directory,
this means that if FlowFuse is installed in `/opt/flowfuse` the directory will be at 
`/opt/flowfuse/var/projects/<project-id>/storage`


## Templates

On FlowFuse Cloud before v2.7.0 the Default Template had an explicit exclusion for 
`10-file.js` to ensure that the replacement FlowFuse File Nodes were loaded. This 
Template was renamed to "Default v1" to differentiate it. If your instance is using
this version of the template then it will need modifying to allow access to the 
default Node-RED File Nodes to make use of the new Persistent Storage. Please
contact FlowFuse support to arrange this, they will also be able to migrate any
files stored in the old service.


## Usage

Simply drop the file nodes into your flows as you would with the regular file nodes in Node-RED. 

**Example:** Write string to a file, then read from the file
<iframe width="100%" height="100%" src="https://flows.nodered.org/flow/7f93fbbf67f9dc4e81bfbeb2b921881e/share" allow="clipboard-read; clipboard-write" style="border: none;"></iframe>

There are more helpful built-in examples on the **Import Examples** dialog in Node-RED.

## Deployment Considerations

When a snapshot is deployed to a device, the original Node-RED file nodes are used and 
any files will be stored on the device's local filesystem.

