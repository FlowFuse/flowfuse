---
navGroup: Support
navTitle: Debugging Node-RED issues
meta:
  description: Learn how to troubleshoot unresponsive Node-RED instances using Safe Mode.
  tags:
    - debugging
    - flowfuse
    - nodered
    - safe mode
---

# Node-RED Safe Mode

When a Node-RED instance is unresponsive, for example due to an infinite loop,
it can be put into Safe Mode.

1. Edit the instance's [Environment Variables](/docs/user/envvar.md)
2. Add a variable called `NODE_RED_ENABLE_SAFE_MODE` to `true`.
3. Save the changes then suspend/restart the instance.

When starting up in Safe Mode, Node-RED will provide access to the editor without
starting the flows. You can log in to the editor, make any necessary changes
and then deploy to restart the flows.

Once recovered you should delete the `NODE_RED_ENABLE_SAFE_MODE` environment variable
to prevent it entering Safe Mode the next time it is restarted.
