# FlowForge Concepts

FlowForge makes it easy to create and manage Node-RED instances. To do that, there
are a few concepts the platform introduces to help organise things.

 - [Project](#project)
   - [Type](#project-type)
   - [Stack](#project-stack)
   - [Template](#project-template)
   - [Snapshot](#project-snapshot)
 - [Team](#team)
 - [Device](#device)

### Project

The platform refers to each Node-RED instance as a Project.

Within the FlowForge application, you can create/start/stop projects and view
its logs.

At present, the projects are fairly plain instances of Node-RED - with some
custom settings to integrate them into the platform properly. There are a number
of settings that can be modified for a project based on what has been configured
and allowed in the [Project Template](#project-template). These can be access
from the Settings page of the project and there is a description of each one in
the settings.

On Docker and Kubernetes based FlowForge instances project names are used as the 
hostname to access the project. This means that  the name must be DNS safe 
(made up of a-z, 0-9 and -), it must also not start with a number.

#### Project Type

When you create a project, you can pick its type from the list the platform
Administrator has made available. For example, each type could provide a different
amount of memory or CPU allocation. In the future, they will also enable different
feature sets.

If the platform has billing enabled, each type may have a different monthly price
associated with it.

#### Project Stack

A Project Stack describes properties of the Project runtime. This can include the
version of Node-RED, memory and CPU allocation. The specific details will depend
on how and where FlowForge is running.

Project Stacks are created and owned by the platform Administrator. When a User
comes to create a new project, they chose from the available stacks associated
with the chosen Project Type.

For details on how to adminster and manage Stacks, please see the
[Administering FlowForge](../admin/#managing-stacks) docs.

#### Project Template

A Project Template describes properties of Node-RED itself. It is how many of the
settings a user familiar with Node-RED would be used to modifying in their settings
file. But it can also be used to customise the palette of nodes that are pre-installed,
provide a set of default flows and change the look and feel of the editor.

A template can also specify [Environment Variables](envvar) which can then have
their values as editable for each project or locked. It is not possible to disable
the use of environment variables in a project.

*Note:* not all of these features are available today.

In the current release of FlowForge, Project Templates are created by the Administrator.
As well as define the values, they also get to choose whether projects are able
to override any of the settings for themselves.

#### Project Snapshot

A snapshot is a point-in-time backup of a project. It captures the flows, credentials
and runtime settings.

Snapshots can be created (and deleted) on the FlowForge dashboard, or using the
[FlowForge Node-RED Tools plugin](./node-red-tools.md).

The dashboard also allows you to roll a project back to a previous snapshot.

### Team

Each project is owned by a Team. Only members of that team have access to the
Node-RED editor for the project. Members have different roles assigned to them
and their [roles determine their authorization level](./team/#role-based-access-control).

### Device

The FlowForge platform can be used to manage projects running on remote devices.
A Device runs a software agent that connects back to the platform to receive updates.
Users must [install the agent](./devices.md) on the devices.

Devices are registered to a Team, and then assigned to a Project within that team.
A user can create a [project snapshot](#project-snapshot) and then mark it as the
*target* snapshot for devices. The platform will then deploy that snapshot to
all of the devices assigned to the project.

