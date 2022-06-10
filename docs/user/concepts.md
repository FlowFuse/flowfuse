# FlowForge Concepts

FlowForge makes it easy to create and manage Node-RED instances. To do that, there
are a few concepts the platform introduces to help organise things.

 - [Project](#project)
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

#### Project Stack

A Project Stack describes properties of the Project runtime. This can include the
version of Node-RED, memory and CPU allocation. The specific details will depend
on how and where FlowForge is running.

Project Stacks are created and owned by the platform Administrator. When a User
comes to create a new project, they chose from the available stacks.


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

Snapshots can be created (and deleted) on the FlowForge dashboard.

*Note:* a future release will add the ability to restore a project to a particular
snapshot. The 0.6 release introduces snapshots as part of the Device feature.

### Team

Each project is owned by a Team. Only members of that team have access to the
Node-RED editor for the project.

Each user in a team can have one of two roles:

 - **Owner** - with full administrative access to the team and its projects
 - **Member** - can access the projects, but limited access to changing Team and
   project settings.

### Device

The FlowForge platform can be used to manage projects running on remote Devices.
A Device runs a software agent that connects back to the platform to receive updates.

Devices are registered to a Team, and then assigned to a Project withing that team.
A user can create a [project snapshot](#project-snapshot) can mark it as the
*target* snapshot for devices. The platform will then deploy that snapshot to
all of the devices assigned to the project.




