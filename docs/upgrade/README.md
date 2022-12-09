# Upgrading FlowForge

If you are upgrading an existing FlowForge installation, this page will list any
particular requirements needed to upgrade to a given level.

Note that we do not support downgrading FlowForge to previous levels once an upgrade
has been performed.

### Upgrading to 1.1

Details of how to upgrade can be found for:

- LocalFS [here](./local/README.md#upgrade).
- Docker [here](./docker/README.md#upgrade).
- Kubernetes [here](./kubernetes/README.md#upgrade).


#### File Server added

This release introduces a system for supporting persitant file storage when running on
Docker or Kubernetes (it will also work with LocalFS, but is not required as projects
have access to the hosts filesystem).

Details of how to configure this can be found for:

- LocalFS [here](./file-storage/README.md#localfs).
- Docker [here](./file-storage/README.md#docker-compose).
- Kubernetes [here](./file-storage/README.md#kubernetes-helm).

### Upgrading to 0.8

#### MQTT Broker added

This release introduces an MQTT Broker into the FlowForge platform used to communicate
between devices and the core platform.

For LocalFS users, they will need to manually setup the broker and ensure it is
properly configured. The documentation for this is available [here](./local/README.md#mosquitto)

#### LocalFS Users

With the 0.8 release we have updated the version of the SQLite3 module used by the localfs 
container driver. We are moving from v5.0.2 to v5.0.8.

There appears to be a clash with the bcrypt module when doing an inplace upgrade of the
SQLite3 module that gives an error similar to the following:

```bash
npm ERR! path /opt/share/projects/flowforge/sqlite-test/node_modules/sqlite3
npm ERR! command failed
npm ERR! command sh -c node-pre-gyp install --fallback-to-build
npm ERR! sh: line 1: node-pre-gyp: command not found
```

If you see this then the simplest fix is to remove the `node_modules` directory and reinstall
the modules.

#### Project Nodes

This release adds support for the new Project Link nodes that can be used to send
messages between projects seamlessly.

These nodes require the MQTT Broker to be properly configured.

To deploy flows using these nodes to a Device will require the Device to be running
the latest 0.2.0 release. They will also need to have their credentials regenerated
once the MQTT Broker has been added.

### Upgrading to 0.7

The 0.7 release introduces the [ProjectType concept](../user/concepts.md#project-type).

After upgrading to 0.7, an administrator must perform the following tasks before
users will be able to create new projects:

1. Create a Project Type.
    1. On the Administrator Settings -> Project Types page, click 'Create project type'.
    2. Provide a name and description. If you have billing enabled, copy in the default
       Stripe Product/Price IDs from your runtime settings file.
    3. Click 'create'
2. Assign your existing stacks to that type
    1. On the Administrator Settings -> Stacks page, edit each existing stack via
       the drop-down menu in the table.
    2. As a one-time action, set its Project Type to the one just created.
    3. Click 'save'. This will update the stack *and* all existing projects to
       be associated with the new Project Type