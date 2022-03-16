# Docker Project Stacks

A Project Stack defines a set of platform configuration options that will get
applied to each project when created.

For container based deployment models, this covers three things:

 - `memory` - the value to apply (in MB) to limit container to consuming.
 - `cpu` - a value between 1 and 100 that is the % of a CPU core the container should be allowed to consume.
 - `container` - this is the fully qualified name of the container to use. The default container built when following the install instructions is named `flowforge/node-red:latest`

## Creating Containers

There is an example `Dockerfile` and `package.json` in the `node-red-container` 
directory. This will start with `nodered/node-red:latest` as it's base and then 
add the required FlowForge components.

If you wanted to pin at Node-RED v2.2.2 you would change the first line to:

```Dockerfile
FROM nodered/node-red:2.2.2

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
    "version": "0.3.0",
    "private": true,
    "dependencies":{
        "@flowforge/nr-storage": "^0.2.0",
        "@flowforge/nr-auth": "^0.2.0",
        "@flowforge/nr-audit-logger": "^0.2.0",
        "node-red-dashboard": "^3.1.6"
    }
}
```

To build the container run the following:

```shell
docker build node-red-container -t flowforge/node-red-dashboard:2.2.2
```

You would then enter `flowforge/node-red-dashboard:2.2.2` in the `container` section
of the Stack configuration.

*Note:* with the 0.3 release, it is not possible to change the Stack being used
by a project. That will come in a future release.