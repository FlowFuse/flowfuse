---
navTitle: FlowFuse Persistent Context
---

# FlowFuse Persistent Context

Some Node-RED flows need a way to persist context values between restarts and FlowFuse stack 
updates but context data is ephemeral by default. With FlowFuse Team and Enterprise tiers,
persistent context storage is possible and it survives restarts, upgrades and more.

## Usage

In your Node-RED, you will now have the option to store values in 2 context stores:
* **Memory**: This is for ephemeral context where you do not want it to be persisted.
* **Persistent**: This is for persistent context where you want values to persist restarts and upgrades.

FlowFuse provides 1MB of context storage per Node-RED instance.

For more information on Context, head over to the [Node-RED Working with context](https://nodered.org/docs/user-guide/context) guide.
