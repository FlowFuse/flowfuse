---
navGroup: Overview
navTitle: Using FlowForge
---

# Using FlowForge

This guide will help you learn how to use the FlowForge platform to quickly create
new Node-RED projects.

## Concepts

Within FlowForge, each Node-RED instance is called a _Project_. The Project is owned
by a _Team_ that provides all the necessary access control.

The Project is created from a _Template_ that provides its default settings and runs
on a _Stack_ that determines the Node-RED version, memory, and CPU usage.

For more details on these and other core concepts, you can learn about them [here](concepts.md).

## Working with Projects

 - [Snapshots](snapshots.md) - Create point-in-time backups of your project.
 - [Environment Variables](envvar.md) - How to manage Environment Variables in your projects.
 - [Change Project Stack](changestack.md) - How to change a projects stack, for example to upgrade Node-RED.
 - [Logs](logs.md) - The Logs available in the FlowForge application.
 - [Project Link Nodes](projectnodes.md) - Custom nodes for sending messages between projects and devices.
 - [Staged Deployments](project-stages.md) - Instruction on how to use FlowForge projects to deploy to the next stage in a DevOps pipeline.
 - [Project Settings](project-settings.md) - Settings available for projects.
 - [Shared Team Library](shared-library.md) - Share flows easily between different projects in your team.
 - [Node-RED Tools Plugin](node-red-tools.md) - A plugin for Node-RED that lets you work with your projects outside of FlowForge.

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
it can be put into Safe Mode. This is done by updating the [Environment Variables](envvar.md)
for a project. Set `NODE_RED_ENABLE_SAFE_MODE` as variable name to the value
`true`, then suspend and restart the project. This will load the editor but not
start the flow which will let you log in and recover. The flows will be started on the next Deploy from the editor.
