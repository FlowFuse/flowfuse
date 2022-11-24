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

 - [Snapshots](snapshots.md) - Create point-in-time backups of your project
 - [Environment Variables](envvar.md) - How to manage Environment Variables in your projects
 - [Change Project Stack](changestack.md) - How to change a projects stack, for example to upgrade Node-RED
 - [Logs](logs.md) - The Logs available in the FlowForge application.
 - [Project Link Nodes](projectnodes.md) - Custom nodes for sending messages between projects and devices.
 - [Project Settings](project-settings.md) - Settings available for projects
 - [Node-RED Tools Plugin](node-red-tools.md) - A plugin for Node-RED that lets you work with your projects outside of FlowForge

## Working with Teams

 - [Team management](./team/) - How to add and remove users from a team
 - [Role based access control](./team/#role-based-access-control) - Which privileges are granted to different roles

## Working with Devices

FlowForge supports deploying projects to remote _Devices_. They run a software agent
that connects back to the platform to receive updates.

 - [Working with Devices](devices.md)
