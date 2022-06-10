# FlowForge Architecture

A FlowForge install is made up of 2 main components

 - The Management Application
 - The Projects running instances of Node-RED

These can be deployed in one of 2 ways

 - On a single machine

   ![LocalFS Architecture](./images/ff-localfs.png)

 - Using a Container Orchestration platform (Kubernetes/Docker Compose)

   ![Container Architecture](./images/ff-containers.png)


## FlowForge Management Application

This provides the interface for managing Users and Projects. It also provides a collection of APIs to support the Projects once started.

A key component is the Container API driver, this is the part that actually creates/destroys Projects, it also keeps track of what Projects should be running and restarts if needed.

### Container Drivers

Projects are started by the FlowForge Management Application via one of the following Container Drivers. Documentation for the Container Driver API will be available in the [API](../api/README.md) section.

#### Localfs

This driver runs Projects as separate processes on the same machine as the FlowForge Management Application. Each Project gets its own `userDir` and a dedicated TCP/IP port to listen to.

State is stored in a local SQLite database

There is no automatic Ingres automation provided by this driver.


#### Kubernetes

This driver runs Projects in separate containers and each instance is accessed by a dedicated hostname via a HTTP Ingres proxy.

State is stored in a provided PostgreSQL database.

Project containers are segregated into their own namespace (currently hardcoded to `flowforge`)

The driver uses the [@kubernetes/client-node](https://www.npmjs.com/package/@kubernetes/client-node) to interact with the cluster.

The driver will create the required Service and Ingres Kubernetes resources to expose each instance via what ever Ingress Controller the underlying Kubernetes cluster provides.

#### Docker-Compose

This driver runs Projects in separate containers and each instance is accessed by a dedicated hostname via a HTTP Ingres proxy.

State is stored in a provided PostgreSQL database.

The driver uses the [dockerode](https://www.npmjs.com/package/dockerode) to interact with the cluster.

The driver will add the required Environment variables to each Project container to work with the [jwilder/nginx-proxy](https://hub.docker.com/r/jwilder/nginx-proxy) NGINX proxy.

## FlowForge Projects

A FlowForge Project is made up of 2 parts

- The FlowForge Launcher
- A Node-RED instance

![Project Architecture](./images/ff-project-arch.png)

### FlowForge Launcher

This is a small application that handles downloading the Project specific settings, building a `settings.js` from those settings and then starting the Node-RED instance.

The launcher presents a HTTP API (it defaults to the Node-RED port + 1000) that allows the FlowForge Management Application to start/stop/restart the Node-RED instance as well as query it's current state and retrieve the console logs.

The launcher project can be found [here](https://github.com/flowforge/flowforge-nr-launcher)

### Node-RED Instance

This is the standard Node-RED package with the following plugins

 - [nr-storage](https://github.com/flowforge/flowforge-nr-storage)
 - [nr-auth](https://github.com/flowforge/flowforge-nr-auth)
 - [nr-audit-logger](https://github.com/flowforge/flowforge-nr-audit-logger)

#### nr-storage

This plugin is used to save flows, settings, sessions and library entries back to the FlowForge Management Application.

This plugin uses the Node-RED [Storage API](https://nodered.org/docs/api/storage)

#### nr-auth

This plugin is used to authenticate users trying to access the Node-RED Editor, it refers back to the FlowForge Management Application to ensure only members of the team that owns the project can log in.

This plugin uses the Node-RED [Authentication API](https://nodered.org/docs/user-guide/runtime/securing-node-red#custom-user-authentication)

#### nr-audit-logger

This plugin sends Node-RED Audit events (e.g. user log in and flow deployment events) back to the to the FlowForge Management Application to allow a reliable audit of what actions have taken place in the project.

This plugin uses the Node-RED [Logging API](https://nodered.org/docs/user-guide/runtime/logging)
