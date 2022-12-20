# FlowForge Persistent Context

Some Node-RED flows need a way to persist context values between restarts and FlowForge stack 
updates but context data is ephemeral by default. With FlowForge Premium, persistent context 
storage is possible and it survives restarts, upgrades and more.

## Usage

In your Node-RED, you will now have the option to store values in 2 context stores:
* **Memory**: This is for ephemeral context where you do not want it to be persisted.
* **Persistent**: This is for persistent context where you want values to persist restarts and upgrades.

For more information on Context, head over to the [Node-RED Working with context](https://nodered.org/docs/user-guide/context) guide.

## Limitations

Currently, only async versions of context `get` and context `set` functions are supported. 

### Supported:
```js
global.set('var1', 'persistent', 'i am the value', (err) {
    //do something
})
global.get('var1', 'persistent', (err, val) => {
    //do something with val
})
```

### Unsupported:
```js
// global.set('var1', 'persistent', 'i am the value')
// const value = global.get('var1', 'persistent')
```
