# FlowForge Architecture

A FlowForge install is made up of 2 main components

 - The Management Application
 - The Projects running instances of Node-RED

These can be deployed in one of 2 ways

 - On a single machine

   ![LocalFS Architecture](./images/ff-localfs.png)

 - Using a Container Orchestation platform (Kubernetes/Docker Compose)

   ![Container Architecture](./images/ff-containers.png)


## FlowForge Management Application

This provides the interface for managing Users and Projects. It also provides a collection of APIs to support the Projects once started.

### Container Drivers

Projects are started by the FlowForge Management Application via one of the following Container Drivers

#### Localfs

This driver runs Projects as separate processes on the same machine as the FlowForge Management Application. Each Project gets its own `userDir` and a dedicated TCP/IP port to listen to.


#### Kubernetes

This driver runs Projects in separate containers and each instance is accesses by a dedicated hostname.

#### Docker-Compose

## FlowForge Projects

A FlowForge Project is made up of 2 parts

- The FlowForge Launcher
- A Node-RED instance

![Project Architecture](./images/ff-project-arch.png)

### FlowForge Launcher

This is a small application that handles downloading the Project specific settings, building a `settings.js` from those settings and then starting the Node-RED instance.

The launcher presents a HTTP API (it defaults to the Node-RED port + 1000) that allows the FlowForge Management Application to start/stop/restart the Node-RED instance as well as query it's current state and retrieve the console logs.

### Node-RED Instance

This is the standard Node-RED package with the following plugins

 - nr-storage
 - nr-auth
 - nr-audit-logger

#### nr-storage

This plugin is used to save flows, settings, sessions and library entries back to the FlowForge Management Application.

#### nr-auth

This plugin is used to authenticate users trying to access the Node-RED Editor, it refers back to the FlowForge Management Application to ensure only members of the team that owns the project can log in.

#### nr-audit-logger

This plugin sends Node-RED Audit events (e.g. user log in and flow deployment events) back to the to the FlowForge Management Application to allow a reliable audit of what actions have taken place in the project.
