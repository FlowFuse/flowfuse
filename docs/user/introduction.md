---
navOrder: 1
navTitle: Introduction
---

# Using FlowFuse

This guide will help you learn how to use the FlowFuse platform to quickly create
new Node-RED applications.

## Concepts

Within FlowFuse, users are members of _Teams_. Each team can create _Applications_
that are collections of one or more _Node-RED instances_. Each instance is created
from a _Template_ to provide its default settings and runs on a _Stack_ that determines
the Node-RED version, memory and CPU usage.

_Devices_ can be assigned to an instance and have flows automatically deployed to
them when _snapshots_ are created of the instance.

For more details on these and other core concepts, you can learn about them [here](concepts.md).

## Working with Applications

 - [DevOps Pipelines](devops-pipelines.md) - How to create DevOps pipelines to easily deploy between Node-RED instances

## Working with Instances

 - [Snapshots](snapshots.md) - Create point-in-time backups of your Node-RED instances.
 - [Environment Variables](envvar.md) - How to manage Environment Variables in your Node-RED instances.
 - [Change Project Stack](changestack.md) - How to change an instance stack, for example to upgrade Node-RED.
 - [Logs](logs.md) - The Logs available in the FlowFuse application.
 - [Project Link Nodes](projectnodes.md) - Custom nodes for sending messages between Node-RED instances and devices.
 - [Instance Settings](instance-settings.md) - Settings available for Node-RED instances.
 - [Shared Team Library](shared-library.md) - Share flows easily between different Node-RED instances in your team.
 - [Node-RED Tools Plugin](node-red-tools.md) - A plugin for Node-RED that lets you work with your flows outside of FlowForge.
 - [High Availability mode](high-availability.md) - Run multiple copies of your instance for scaling and availability.

## Working with Teams

 - [Team management](./team/) - How to add and remove users from a team.
 - [Role based access control](./team/#role-based-access-control) - Which privileges are granted to different roles.

## Working with Devices

FlowFuse supports deploying projects to remote _Devices_. They run a software agent
that connects back to the platform to receive updates.

 - [Working with Devices](../device-agent/introduction.md)

## Working with Files and Context

FlowFuse supports reading and writing persistent files and persistent context.

 - [Working with Files](filenodes.md)
 - [Working with Context](persistent-context.md)
