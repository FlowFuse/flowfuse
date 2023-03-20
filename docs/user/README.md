---
navGroup: Overview
navTitle: Using FlowForge
---

# Using FlowForge

This guide will help you learn how to use the FlowForge platform to quickly create
new Node-RED applications.

## Concepts

Within FlowForge, users are members of _Teams_. Each team can create _Applications_
that are collections of one or more _Node-RED instances_. Each instance is created
from a _Template_ to provide its default settings and runs on a _Stack_ that deterines
the Node-RED version, memory and CPU usage.

_Devices_ can be assigned to an instance and have flows automatically deployed to
them when _snapshots_ are created of the instance.

For more details on these and other core concepts, you can learn about them [here](concepts.md).

## Working with Instances

 - [Snapshots](snapshots.md) - Create point-in-time backups of your Node-RED instances.
 - [Environment Variables](envvar.md) - How to manage Environment Variables in your Node-RED instances.
 - [Change Project Stack](changestack.md) - How to change an instance stack, for example to upgrade Node-RED.
 - [Logs](logs.md) - The Logs available in the FlowForge application.
 - [Project Link Nodes](projectnodes.md) - Custom nodes for sending messages between Node-RED instances and devices.
 - [Staged Deployments](staged-deployments.md) - How to create DevOps pipelines between Node-RED instances
 - [Instance Settings](instance-settings.md) - Settings available for Node-RED instances.
 - [Shared Team Library](shared-library.md) - Share flows easily between different Node-RED instances in your team.
 - [Node-RED Tools Plugin](node-red-tools.md) - A plugin for Node-RED that lets you work with your flows outside of FlowForge.

## Working with Teams

 - [Team management](./team/) - How to add and remove users from a team.
 - [Role based access control](./team/#role-based-access-control) - Which privileges are granted to different roles.

## Working with Devices

FlowForge supports deploying projects to remote _Devices_. They run a software agent
that connects back to the platform to receive updates.

 - [Working with Devices](devices.md)

## Working with Files and Context

FlowForge supports reading and writing persistent files and persistent context.

 - [Working with Files](filenodes.md)
 - [Working with Context](persistent-context.md)

## Debugging and fixing Node-RED issues

### Node-RED Safe Mode

When a Node-RED instance is unresponsive, for example due to an infinite loop,
it can be put into Safe Mode.

1. Edit the instance's [Environment Variables](envvar.md)
2. Add a variable called `NODE_RED_ENABLE_SAFE_MODE` to `true`.
3. Save the changes then suspend/restart the instance.

When starting up in Safe Mode, Node-RED will provide access to the editor without
starting the flows. You can log in to the editor, make any necessary changes
and then deploy to restart the flows.

Once recovered you should delete the `NODE_RED_ENABLE_SAFE_MODE` environment variable
to prevent it entering Safe Mode the next time it is restarted.
