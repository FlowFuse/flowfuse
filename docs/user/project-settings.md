# Project Settings

## HTTP Nodes

The HTTP Endpoints served by the Node-RED runtime, except the editor, are by
default accessable anywhere in the world. When building a dashboard for example
this might not be intended. Pages like these can be secured using HTTP Basic
Auth. A username and password combination can be added in a projects settings
in the `Editor` tab.

## Copy a Project 

Projects can be copied to either a new or existing other project. The settings,
credentials, and environment variables will be copied along with the flows or
the project. A copy can be initiated in the "Danger" tab the source projects
settings.
