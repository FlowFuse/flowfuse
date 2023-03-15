# Changing the Stack

[Stacks](concepts.md#project-stack) define various aspects of how Node-RED instances run - including the version of Node-RED being used.

FlowForge allows you to change the stack an instance is using - providing a way
to upgrade Node-RED.

**Note:** Stacks are created by Administrators and made available to the teams
and users of the platform.

When an Administrator creates a new version of a Stack your instance is using,
the platform will notify you that there is a new version available.

To change an instance's stack:

1. Go to the instance's page and select **Settings** in the sidebar.
2. Click the **Change Instance Stack** button
3. You will be prompted to select the new stack.
4. Click **Change Stack**

Your instance will now be restarted on the new stack.

**Note:** Changing the stack causes Node-RED to be stopped and restarted. This
will require a short downtime of the flows.
