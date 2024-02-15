---
navGroup: FlowFuse Self-Hosted
navOrder: 2
navTitle: Upgrading FlowFuse
---

# Upgrading FlowFuse

If you are upgrading an existing FlowFuse installation, this page will list any
particular requirements needed to upgrade to a given level.

If you are upgrading across multiple versions, make sure you check the requirements
for each version you are upgrading across.

Note that we do not support downgrading FlowFuse to previous levels once an upgrade
has been performed.

## General guideline

Details of how to upgrade can be found for each deployment model:

- [LocalFS](../install/local/README.md#upgrade)
- [Docker](../install/docker/README.md#upgrade)
- [Kubernetes](../install/kubernetes/README.md#upgrade)


### Upgrading to 2.0.0

> **⚠️**  Breaking changes introduced!

Together with new application features, this **release 2.0.0 introduces breaking changes** in Flowfuse Helm chart.
If you are managing your local Flowfuse instance using our [Helm Chart](https://github.com/FlowFuse/helm/tree/main/helm/flowforge), please refer to the [upgrade](../install/kubernetes/README.md#upgrade) section of the Kubernetes installation guide or the Helm Chart [README.md](https://github.com/FlowFuse/helm/blob/main/helm/flowforge/README.md#upgrading-chart) for more details.


### Upgrading to 1.10

Endpoint Rate Limiting is now available to FlowFuse. This is disabled by default, but can be enabled by setting the `rate_limits.enabled` config setting to `true`.
The documentation for this is available [here](../install/configuration.md#rate-limiting-configuration).

The [TeamType concept](../user/concepts.md#team-type) was expanded in this release.
It is used to control what Instance Types are available for different teams, as
well as any additional limits that should be applied. When creating new Instance
Types, they must now be [manually enabled](../admin/introduction.md#managing-instance-types)
for the Team Types on the platform.


### Upgrading to 1.5

The main change in this release was a change in our terminology around the individual
Node-RED instances. We have introduced the [Application concept](../user/concepts.md#application)
as a way to group individual [Node-RED instances](../user/concepts.md#instance) (what we previously called Projects).

The term 'Project' is being phased out. You may still see it crop up, such as
in some of the external APIs, but we're working our way through removing it.

### Upgrading to 1.3


To enable the Team Library and FlowFuse-based Authentication of HTTP routes each
Node-RED instance will need to be updated to the [latest Stack](../user/changestack.md).

#### Persistent Context added

The new Persistent Context feature is available to projects when running with a
[premium license](./open-source-to-premium.md).

This feature requires additional configuration to be added to the File Server component
that was introduced in FlowFuse 1.1.

Details of how to configure this can be found at the following links:

- [LocalFS](../install/file-storage/README.md#localfs)
- [Docker and Kubernetes](../install/file-storage/README.md#configuring)

### Upgrading to 1.1

#### File Server added

This release introduces a system for supporting persistent file storage when running on
Docker or Kubernetes (it will also work with LocalFS, but is not required as projects
have access to the hosts filesystem).

Details of how to configure this can be found at the following links:

- [LocalFS](../install/file-storage/README.md#localfs)
- [Docker and Kubernetes](../install/file-storage/README.md#configuring)

### Upgrading to 0.8

#### MQTT Broker added

This release introduces an MQTT Broker into the FlowFuse platform used to communicate
between devices and the core platform.

For LocalFS users, they will need to manually setup the broker and ensure it is
properly configured. The documentation for this is available [here](../install/local/#setting-up-mosquitto-(optional))

#### LocalFS Users

With the 0.8 release we have updated the version of the SQLite3 module used by the localfs 
container driver. We are moving from v5.0.2 to v5.0.8.

There appears to be a clash with the bcrypt module when doing an in place upgrade of the
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

The 0.7 release introduces the [ProjectType concept](../user/concepts.md#instance-type).

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
