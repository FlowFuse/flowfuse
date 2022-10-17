# Docker Project Stacks

A Project Stack defines a set of platform configuration options that will get
applied to each project when created.

For container based deployment models, this covers three things:

 - `memory` - the amount of memory (in MB) to limit container to. Recommended minimum: `256`.
 - `cpu` - a value between 1 and 100 that is the % of a CPU core the container should be allowed to consume.
 - `container` - this is the fully qualified name of the container to use. The default container built when following the install instructions is named `flowforge/node-red:latest`

FlowForge supports Node-RED 2.2.x and later.

## Creating Containers

There is an example `Dockerfile` and `package.json` in the [node-red-container](https://github.com/flowforge/docker-compose/tree/main/node-red-container) 
directory of the [docker-compose](https://github.com/flowforge/docker-compose) project. This will start with `nodered/node-red:latest` 
as it's base and then add the required FlowForge components.

If you wanted to pin at Node-RED v3.0.2 you would change the first line to:

```docker
FROM nodered/node-red:3.0.2

ARG REGISTRY
RUN if [[ ! -z "$REGISTRY" ]] ; then npm config set @flowforge:registry "$REGISTRY"; fi

COPY package.json /data
...
```

To add nodes to the default image you can add them to the `package.json` file along 
side the FlowForge plugins

```json
{
    "name": "node-red-project",
    "description": "A Node-RED Project",
    "version": "0.7.0",
    "private": true,
    "dependencies":{
        "@flowforge/nr-storage": "^0.10.0",
        "@flowforge/nr-auth": "^0.10.0",
        "@flowforge/nr-audit-logger": "^0.10.0",
        "node-red-dashboard": "^3.1.6"
    }
}
```

To build the container run the following:

```shell
docker build node-red-container -t flowforge/node-red-dashboard:3.0.2
```

You would then enter `flowforge/node-red-dashboard:3.0.2` in the `container` section
of the Stack configuration.

Stacks can be changed on a per project basis, see also the
[user stack documentation](../../user/changestack.md).
