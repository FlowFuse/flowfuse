# FlowFuse Persistent Context

Some Node-RED flows require the ability to persist context values between restarts and FlowFuse stack updates. By default, context data in Node-RED is ephemeral, meaning it does not survive restarts or stack updates. With FlowFuse Starter, Team and Enterprise tiers, however, you can enable **persistent context storage**, ensuring that your context values persist across restarts, upgrades, and more.

## Usage

In Node-RED with FlowFuse, you now have two context store options:

1. **Memory Context**: This is the default ephemeral context. Values stored in memory are not persistent and will be lost when Node-RED restarts or the Node-RED stack is updated.
   
2. **Persistent Context**: This allows context values to persist even when Node-RED restarts, updates.

The amount of persistent storage available to you depends on the FlowFuse plan you're subscribed to. FlowFuse offers different storage sizes for each plan, allowing you to select the appropriate level of storage for your needs. For detailed information on storage options, please refer to the [pricing page](/pricing/).

### How to Use FlowFuse Persistent Context

Using persistent context in Node-RED is similar to using memory context, with the key difference being that you specify the storage type for your context data. Here’s how to use persistent context it:

#### Using Persistent Context in Nodes

When configuring persistent context in different nodes (e.g., Change, Inject, or Switch nodes), you can select the type of context storage to use. By default, the context type is set to **Memory**, but you can change it to **Persistent** to store values across restarts.

- **Change Node, Inject Node, Switch Node**:  
  When you configure these nodes to store or access context data, you’ll notice a storage option at the right corner. By default, it will be set to **Memory**. To make the context **persistent**, simply switch the selection to **Persistent**.

![Persistent Store Option in Change Node](https://flowfuse.com/img/variables-in-node-red-change-node-persistent-store-option--UYd_d_m4p-528.webp)

#### Using Persistent Context in Function Nodes

In **Function nodes**, you interact with context data using the `set` and `get` methods. These methods allow you to specify where the context data should be stored or accessed from.

- **Setting Context**:
  To set a persistent context value, use the `set` method with three arguments. The third argument specifies the context store, which should be set to **persistent**. For example:

  ```javascript
  context.set('myKey', 'myValue', 'persistent');
  ```

This argument is optional and defaults to memory. This means that if you leave it empty, it will use memory as the context store.

- **Getting Context**:

When retrieving persistent context, use the `get` method with two arguments. The second argument is optional and specifies the context store (either memory or persistent).

Example:

```javascript
var value = context.get('myKey', 'persistent');
```

If you don't specify the store, it defaults to memory. 

For more detailed information, refer to the article [Understanding Node, Flow, Global, and Environment Variables in Node-RED](/blog/2024/05/understanding-node-flow-global-environment-variables-in-node-red/).
