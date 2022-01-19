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
