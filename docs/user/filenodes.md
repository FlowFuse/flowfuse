# FlowForge File Nodes

Projects running within FlowForge include a set of nodes that make it possible
in a containered environment to read and write to persistent storage.

The File Nodes are a clone of the original Node-RED nodes so that flows written
for the cloud can be ran the same on a device which uses its own local filesystem.

For that reason, these nodes cannot be used at the same time as the built-in 
Node-RED file nodes. To use these nodes, you must exclude 10-file-js in the 
`nodesExcludes` array in your settings file.


### Nodes

There are two nodes in the File Node collection:

- `file` - A file node for writing to persistent storage provided by a @FlowForge/file-storage server
- `file in` - A file node for reading from persistent storage provided by a @FlowForge/file-storage server

The nodes send the whole `msg` object between projects. Due to the way the nodes
encode messages, there are some data types that do not get sent. For example,
the `msg.req`/`msg.res` properties used by the core HTTP nodes will not be sent.


### GitHub

The nodes are published under an Apache-2.0 license and available on [GitHub](https://github.com/flowforge/flowforge-nr-file-nodes).
