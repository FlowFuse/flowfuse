---
navTitle: FlowForge Concepts
---

# FlowForge Concepts

FlowForge makes it easy to create and manage Node-RED instances. To do that, there
are a few concepts the platform introduces to help organise things.

 - [Team](#team)
 - [Application](#application)
 - [Instance](#instance)
   - [Type](#instance-type)
   - [Stack](#stack)
   - [Template](#template)
   - [Snapshot](#instance-snapshot)
 - [Device](#device)


### Team

Teams are how FlowForge organises the user on the platform. Each team can have
multiple members, and each user can be a member of multiple teams.

The users in a team can have different roles that determine what they are
[able to do](./team/#role-based-access-control).

In FlowForge Cloud, each team has its own billing plan, managed via Stripe.

### Application

**This is a new concept introduced in FlowForge 1.5**

To organise your Node-RED instances, they are grouped with Applications.

With the 1.5 release, each Application has a single Node-RED instance. But later
releases will introduce the ability to have multiple Node-RED instances within
the application.

In the future, this will enable you to create dev-ops pipelines between those
instances; making it easy to have separate development and production instances
within the application.

### Instance

**This was called a Project before FlowForge 1.5**

Within your Application you can have one or more (coming soon) Instances of Node-RED.

The Instance is a customised version of Node-RED that includes various FlowForge
plugins to integrate it with the platform.

A number of the standard Node-RED settings are exposed for customisation, and they
can be preset by applying a Template when creating the Instance.

When running in Docker or Kubernetes (such as FlowForge Cloud), the instance names
are used as the hostname to access the instance. This means that the names must
be DNS safe (made up of a-z, 0-9 and -) and not start with a number. Currently
it is not possible to change an instance name after it has been created.

Within the instance there are some further concepts to learn about.

#### Instance Type

When you create a Node-RED instance, you can pick its type from the list the platform
Administrator has made available. For example, each type could provide a different
amount of memory or CPU allocation.

If the platform has billing enabled, each type may have a different monthly price
associated with it.

#### Stack

A Stack describes properties of the Node-RED runtime. This can include the
version of Node-RED, memory and CPU allocation. The specific details will depend
on how and where FlowForge is running.

Stacks are created and owned by the platform Administrator. When a User
comes to create a new Node-RED instance, they chose from the available stacks associated
with the chosen Instance Type.

For details on how to administer and manage Stacks, please see the
[Administering FlowForge](../admin/#managing-stacks) docs.

#### Template

A Template describes properties of Node-RED itself. It is how many of the
settings a user familiar with Node-RED would be used to modifying in their settings
file. But it can also be used to customise the palette of nodes that are pre-installed,
provide a set of default flows and change the look and feel of the editor.

A template can also specify [Environment Variables](./envvar.md) which can then have
their values customised for each Node-RED instance, or have their values locked
to prevent any changes.

In the current release of FlowForge, Templates are created by the Administrator.
As well as define the values, they also get to choose whether instances are able
to override any of the settings for themselves.

#### Instance Snapshot

A snapshot is a point-in-time backup of a Node-RED instance. It captures the flows, credentials
and runtime settings.

Snapshots can be created (and deleted) on the FlowForge dashboard, or using the
[FlowForge Node-RED Tools plugin](./node-red-tools.md).

The dashboard also allows you to roll an instance back to a previous snapshot.

### Device

The FlowForge platform can be used to manage Node-RED applications running on remote devices.
A Device runs a software agent that connects back to the platform to receive updates.
Users must [install the agent](./devices.md) on the devices.

Devices are registered to a Team, and then assigned to an individual Node-RED instance within that team.
A user can create a [snapshot](#snapshot) and then mark it as the
*target* snapshot for devices. The platform will then deploy that snapshot to
all of the devices assigned to the instance.

To further simplify device registration, Provisioning Tokens can be created to allow 
devices to automatically connect to a team without having to manually register them first.
The token can also be configured to assign a device directly to a Node-RED instance within the team.
