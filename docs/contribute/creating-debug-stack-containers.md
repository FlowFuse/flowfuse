---
navTitle: Creating debug stack containers
meta:
  description: Guide for creating and using debug containers in FlowFuse without rebuilding from scratch.
  tags:
    - node-red
    - flowfuse
    - docker
    - debugging
---

Sometimes we want to be able to run some debug code within a stack running in our
staging test environment.

For example, changes to the `nr-launcher` component or any of the other components
that run within the stack.

This guide shows a simple way to do that without having to rebuild the container
from scratch each time.

This will require:

1. Docker
2. A container registry you can push images to. For example, a free DockerHub account where you can push images

### Creating a debug container

Pick an existing container image to use as your starting point. For example, `flowfuse/node-red:2.5.0-4.0.x`
contains `nr-launcher@2.5.0` and the latest Node-RED 4.x release.

**Note**: our staging environments requires `arm64` based containers. The following instructions work for
Macs (with M1/M2) - additional steps may be needed for other OS; please contribute them if you know them.

Use the following command to open a shell into the container:

```
docker run -it --entrypoint /bin/bash flowfuse/node-red:2.5.0-4.0.x
```

The prompt will then look like this:

```
e8dcd669ea4c:/usr/src/flowforge-nr-launcher$
```

Take a note of the `e8dcd669ea4c` - this is the id of the container instance you have created.

The following directories are probably of interest:

 - `/usr/src/flowforge-nr-launcher` - contains the `nr-launcher` code and its dependencies
 - `/usr/src/node-red` - contains the `node-red` code

Using `vi`, you can edit the files to make the changes you want and when you're done, exit the shell.

Having made the changes, use `docker commit` to create a new container image. The command requires
the id of the container you've just edited and the tag for the container. It also needs to restore
the `entrypoint` configuration back to the default.

```
docker commit \
  --change='ENTRYPOINT ["./node_modules/.bin/flowfuse-node-red", "-p", "2880", "-n", "/usr/src/node-red"]' \
  e8dcd669ea4c \
  knolleary/ff-debug:debug-1
```

Finally, you can push the new container to your container registry.

```
docker push knolleary/ff-debug:debug-1
```


### Using the container in FlowFuse

Debug containers should *only* be used in pre-staging/staging environments. Do *not* add to production.

Once pushed, you can create a custom stack in the FlowFuse admin section and give it the location
of your container.


### Iterating

If you find you want to add some more debug, repeat the process, however use your existing image
as the starting point:

```
docker run -it --entrypoint /bin/bash knolleary/ff-debug:debug-1
```

Be sure to increment the number in the image name (`debug-2`) when you commit and push the new container.

### Tidying up

Remember to delete your instances/stacks once you're done, as well as all of the local
docker images and containers that have been created along the way.
