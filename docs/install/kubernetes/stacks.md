---
navTitle: Kubernetes Project Stacks
---

# Kubernetes Stacks

A Stack defines a set of platform configuration options that will get
applied to each Node-RED instance when created.

For container based deployment models, this covers three things:

 - `memory` - the amount of memory (in MB) to limit container to. Recommended minimum: `256`.
 - `cpu` - a value between 1 and 100 that is the % of a CPU core the container should be allowed to consume.
 - `container` - this is the fully qualified name of the container to use. The default container built when following the install instructions is named `flowfuse/node-red:latest`

 ## Creating Containers

 There is an example `Dockerfile` and `package.json` in the [node-red-container](https://github.com/FlowFuse/helm/tree/main/node-red-container) 
directory of the [helm](https://github.com/FlowFuse/helm) project. This will start with `nodered/node-red:latest` 
as it's base and then add the required FlowFuse components.

Builds of this container for amd64, arm64 and armv7 are built for every release and published to Docker hub as [flowfuse/node-red](https://hub.docker.com/r/flowfuse/node-red). These can be used as a base to build custom stacks.

If you wanted to pin at Node-RED v3.0.2 you would change the first line to:

```docker
FROM nodered/node-red:3.0.2

ARG REGISTRY
RUN if [[ ! -z "$REGISTRY" ]] ; then npm config set @flowfuse:registry "$REGISTRY"; fi

COPY package.json /data
...
```

To add nodes to the default image you can extend the supplied container.
The following Dockerfile will install the node-red-dashboard

```docker
FROM flowfuse/node-red

WORKDIR /usr/src/node-red
RUN npm install node-red-dashboard

WORKDIR /usr/src/flowforge-nr-launcher
```

To build the container run the following:

```shell
docker build node-red-container/Dockerfile-dashboard -t [your.container.registry]/flowfuse/node-red-dashboard:3.0.2
docker push [your.container.registry]/flowfuse/node-red-dashboard:3.0.2
```

You would then enter `[your.container.registry]/flowforge/node-red-dashboard:3.0.2` in the `container` section
of the Stack configuration.

Stacks can be changed on a per Node-RED instance basis, see also the
[user stack documentation](../../user/changestack.md).
