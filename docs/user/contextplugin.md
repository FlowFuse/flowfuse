# FlowForge Persistent Context Plugin

Some Node-RED flows need a way to persist context values between restarts and FlowForge stack 
updates but context data is ephemeral by default. With FlowForge Premium, persistent context 
storage is possible and it survives restarts, upgrades and more.

## Usage

In your Node-RED, you will now have the option to store values in 2 context stores...
* **Memory**: This is for volatile context where you do not want it to be persisted
* **Persistent**: This is for persistent context where you want values to persist restarts and upgrades

For more information on Context, head over to the [Node-RED User Guide](https://nodered.org/docs/user-guide/)

## Deployment Considerations

When a project is deployed to a device, Node-RED will use the devices memory for the **Memory** store
and the devices filesystem for the **Persistent** store

## Limitations

Currently, only async versions of context `get` and context `set` functions are supported. 
View the [readme](https://github.com/flowforge/flowforge-nr-persistent-context#flowforgenr-persistent-context) for more info.

## GitHub

The plugin is published under an Apache-2.0 license and available on [GitHub](https://github.com/flowforge/flowforge-nr-persistent-context).
