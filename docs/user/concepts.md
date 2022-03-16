# FlowForge Concepts

FlowForge makes it easy to create and manage Node-RED instances. To do that, there
are a few concepts the platform introduces to help organise things.

### Project

The platform refers to each Node-RED instance as a Project.

Within the FlowForge application, you can create/start/stop projects and view
its logs.

With the 0.1.0 release, the projects are fairly plain instances of Node-RED -
with some custom settings to integrate them into the platform properly. In the
future it will be possible to further customise the project settings.

### Team

Each project is owned by a Team. Only members of that team have access to the
Node-RED editor for the project.

Each user in a team can have one of two roles:

 - **Owner** - with full administrative access to the team and its projects
 - **Member** - can access the projects, but limited access to changing Team and project settings.

### Project Stack

A Project Stack describes properties of the Project runtime. This can include the
version of Node-RED, memory and CPU allocation. The specific details will depend
on how and where FlowForge is running.

Project Stacks are created and owned by the platform Administrator. When a User
comes to create a new project, they chose from the available stacks.

### Project Template

A Project Template describes properties of Node-RED itself. It is how many of the
settings a user familiar with Node-RED would be used to modifying in their settings
file. But it can also be used to customise the palette of nodes that are preinstalled,
provide a set of default flows and change the look and feel of the editor.

*Note:* not all of these features are available today.

In the current release of FlowForge, Project Templates are created by the Administrator.
As well as define the values, they also get to choose whether projects are able
to override any of the settings for themselves.