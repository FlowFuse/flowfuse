---
navTitle: FlowFuse Concepts
navOrder: 2
---

# FlowFuse Concepts

FlowFuse makes it easy to create, manage, and scale Node-RED instances. The platform introduces a few core concepts to help you organize and work with it effectively. Throughout the platform, you'll also see ⓘ icons that you can click on to get pop-up explanations for different features and terms.

## Table of Contents

- [FlowFuse Concepts](#flowfuse-concepts)
  - [Table of Contents](#table-of-contents)
  - [Team](#team)
    - [Team Type](#team-type)
  - [Application](#application)
    - [DevOps Pipeline](#devops-pipeline)
  - [Instance](#instance)
    - [Hosted Instance](#hosted-instance)
    - [Remote Instance](#remote-instance)
    - [Instance Configuration](#instance-configuration)
    - [Instance Type](#instance-type)
    - [Stack](#stack)
    - [Blueprint](#blueprint)
    - [Template](#template)
    - [Snapshot](#snapshot)
      - [Hosted Instance Snapshot](#hosted-instance-snapshot)
      - [Remote Instance Snapshot](#remote-instance-snapshot)
    - [Assigning Remote Instances to Hosted Instances](#assigning-remote-instances-to-hosted-instances)
      - [How It Works](#how-it-works)
      - [Assignment Rules](#assignment-rules)
      - [When to Use Instance Assignment vs DevOps Pipelines](#when-to-use-instance-assignment-vs-devops-pipelines)
  - [Device](#device)
    - [Device Agent](#device-agent)
    - [Fleet Mode vs Developer Mode](#fleet-mode-vs-developer-mode)
    - [Provisioning Tokens](#provisioning-tokens)
  - [Device Groups](#device-groups)

## Team

Teams are how FlowFuse organizes users on the platform. Each team can have multiple members and each user can be a member of multiple teams.

The users in a team can have different roles that determine what they are [able to do](./team/#role-based-access-control). In FlowFuse Cloud, each team has its own billing plan, managed via Stripe.

### Team Type

The platform can be configured to provide different types of teams. These can be used to apply limits on what teams of a given type can do. For example, a particular team type may be restricted to certain types of [Node-RED instances](#instance), or how many members the team can have.

## Application

**Introduced in FlowFuse 1.5**

To organize your Node-RED instances, they are grouped within Applications. With the 1.5 release, each Application has a single Node-RED instance. With the 1.6 release, an application can have multiple Node-RED instances.

Applications provide logical organization of related instances, support for DevOps pipeline workflows, simplified device group management, application-level audit logging, and clear organizational boundaries for managing multiple instances and devices.

With FlowFuse's Granular RBAC, Applications can now also act as an authorization boundary. This means user roles and permissions can be managed at the application level, providing finer control over access to instances, snapshots, and devices within a given application.

### DevOps Pipeline

**Introduced in FlowFuse 1.8**

DevOps Pipelines allow you to manage staged development environments, pushing from your Development instances to Production once you have stable and well-tested flows. You can find out how to implement DevOps Pipelines [here](./devops-pipelines.md).

## Instance

**This was called a Project before FlowFuse 1.5**

Within your Application, you can have one or more instances of Node-RED. FlowFuse supports two types of instances based on where they run.

### Hosted Instance

A **Hosted Instance** is a Node-RED environment that runs within the FlowFuse infrastructure, whether in the cloud or on a self-hosted FlowFuse platform. These instances run on FlowFuse-managed infrastructure and benefit from automatic scaling and high availability. They are accessed via HTTPS with TLS/SSL encryption, making them ideal for centralized data processing and transformation, dashboard hosting, cloud service integration, and development or testing environments.

When running in Docker or Kubernetes (such as FlowFuse Cloud), the instance names are used as the hostname to access the instance. This means that the names must be DNS safe (made up of a-z, 0-9 and -) and not start with a number. Currently, it is not possible to change an instance name after it has been created.

### Remote Instance

A **Remote Instance** refers to a Node-RED environment that is managed by FlowFuse but runs on external infrastructure—be it a PLC, Gateway, local PC, or even a server in a different network. Remote instances used to be referred to as Devices within the FlowFuse platform, and in some parts of the platform this terminology is still used. See the [Device](#device) section for more details.

These instances run on user-provided infrastructure such as edge devices, on-premises servers, or industrial equipment while being managed centrally through the FlowFuse platform. They are ideal for edge computing, local data processing, and environments with limited connectivity. Remote instances require FlowFuse Device Agent installation to connect to the platform.

### Instance Configuration

Both hosted and remote instances are customized versions of Node-RED that include various FlowFuse plugins to integrate with the platform. A number of the standard Node-RED settings are exposed for customization, and they can be preset by applying a Template when creating the instance.

When an instance is being created, the user can select a blueprint to use.

### Instance Type

When you create a Node-RED instance, you can pick its type from the list the platform Administrator has made available. For example, each type could provide a different amount of memory or CPU allocation. If the platform has billing enabled, each type may have a different monthly price associated with it.

### Stack

A Stack describes the properties of the Node-RED runtime. This can include the version of Node-RED, memory, and CPU allocation. The specific details will depend on how and where FlowFuse is running.

Stacks are created and owned by the platform Administrator. When a User comes to create a new Node-RED instance, they choose from the available stacks associated with the chosen Instance Type. The stack determines the Node-RED version, memory, and CPU usage for your instance, ensuring compatibility and optimal performance for your use case.

For details on how to administer and manage Stacks, please see the [Administering FlowFuse](../admin/introduction.md#managing-stacks) docs.

### Blueprint

Blueprints are pre-built Node-RED instances designed for industrial applications. They include ready-to-use flows along with all node configurations and the required nodes, as well as environment settings, allowing the instance to be deployed with minimal modification.

### Template

A Template describes the properties of Node-RED itself. It is how many of the settings a user familiar with Node-RED would be used to modifying in their settings file. But it can also be used to customize the palette of nodes that are pre-installed, provide a set of default flows and change the look and feel of the editor.

A template can also specify [Environment Variables](./envvar.md) which can then have their values customized for each Node-RED instance, or have their values locked to prevent any changes. In the current release of FlowFuse, Templates are created by the Administrator. As well as defining the values, they also get to choose whether instances can override any of the settings for themselves.

### Snapshot

Snapshots are point-in-time backups that work differently depending on the instance type.

#### Hosted Instance Snapshot

A snapshot is a point-in-time backup of a hosted Node-RED instance. It captures the flows, credentials, and runtime settings. Snapshots can be created and deleted on the FlowFuse Platform, or using the [FlowFuse Node-RED Tools plugin](/docs/migration/node-red-tools.md). The platform also allows you to roll an instance back to a previous snapshot.

A user can create an hosted instance snapshot and then mark it as the *target* snapshot for remote instance. The platform will then deploy that snapshot to all of the devices assigned to the instance. Snapshots can be set as targets for DevOps pipeline stages. Auto snapshots are available for automatic backup scheduling. If an auto snapshot is set as a target or assigned to a pipeline stage, it will not be automatically cleaned up, so you may have more than 10 auto snapshots in that case.

#### Remote Instance Snapshot

Similar to instance snapshots, a device snapshot is a point-in-time backup of a Node-RED instance running on a remote device. It captures the flows, credentials, and runtime settings. The difference is that local changes made on a device during developer mode are pulled into the FlowFuse platform and stored as a snapshot. The dashboard also allows you to see and manage these snapshots. With devices assigned to an application, a user can create a device snapshot from the remote device.

### Assigning Remote Instances to Hosted Instances

**Note:** This is a legacy feature that predates DevOps Pipelines. For new deployments, consider using [DevOps Pipelines](#devops-pipeline) instead, which provide more flexible and powerful deployment workflows.

Instance assignment establishes a parent-child deployment relationship between a hosted instance and remote instances. When assigned, the hosted instance becomes the source of truth and automatically pushes snapshots to the remote instance. You can only push nodes and flows that are supported by both Hosted and Remote Instances. For more information on how this works, see [How Instance Assignment Works](/docs/user/concepts.md#how-it-works).

#### How It Works

Instance assignment creates a parent-child deployment relationship with the following behavior:

- **Hosted Instance (Parent)**: Acts as the deployment controller and source of truth for snapshots
- **Remote Instance (Child)**: Receives and applies snapshot updates from the parent
- **Deployment Flow**: When you set a [Target Snapshot](/docs/user/snapshots/#instance-owned-devices) on the hosted instance, all assigned remote instances automatically restart on that snapshot
- **One-Way Relationship**: Changes flow exclusively from the hosted instance to remote instances, ensuring consistent deployments across your fleet

#### Assignment Rules

FlowFuse enforces specific constraints on instance assignment:

- Remote instances can be assigned to hosted instances
- Remote instances cannot be assigned to other remote instances
- Hosted instances cannot be assigned to any other instances

#### When to Use Instance Assignment vs DevOps Pipelines

Instance assignment suits straightforward scenarios where you need to push snapshots from a single hosted instance directly to one or more remote instances. It works well for maintaining existing deployments or when you simply need one hosted instance deploying to multiple remote instances without staging environments.

DevOps Pipelines are recommended for most deployment workflows. They support staged environments for testing changes in development before promoting to production, enable deployment to device groups for easier fleet management, and offer more flexibility aligned with modern development practices. If you're setting up a new deployment process, use DevOps Pipelines.

## Device

The FlowFuse platform can be used to manage Node-RED applications running on remote devices. A Device is essentially a **Remote Instance** that runs a software agent to connect back to the platform and receive updates.

Users must [install the agent](../device-agent/install/overview.md) on the devices. Devices are registered to a Team and then assigned to an individual Node-RED instance or a FlowFuse application within that team. A user can create an [instance snapshot](#hosted-instance-snapshot) and then mark it as the *target* snapshot for devices. The platform will then deploy that snapshot to all of the devices assigned to the instance. With devices assigned to an application, a user can create a [device snapshot](#remote-instance-snapshot) from the remote device.

### Device Agent

The FlowFuse Device Agent is the software that connects your hardware to FlowFuse and manages how Node-RED runs on it. It receives snapshots from FlowFuse, installs the required Node-RED version and nodes, and ensures the device always runs the assigned snapshot. It maintains a secure connection so FlowFuse can monitor the device and send updates remotely. Read more about the [Device Agent](../device-agent/introduction.md).

### Fleet Mode vs Developer Mode

**Fleet Mode**
When in this mode, the device runs only the assigned target snapshot. It automatically updates whenever the target snapshot changes, and the Node-RED editor is disabled to prevent any local modifications. This keeps all devices consistent across the fleet.

**Developer Mode**
When in this mode, the device ignores the target snapshot and stops receiving updates. A secure tunnel opens so you can access the Node-RED editor and make changes directly on the hardware. When you exit Developer Mode, all local edits are discarded and the device reloads the current target snapshot.

### Provisioning Tokens

Provisioning tokens can be created to allow Remote Instances to automatically join a team and to be auto assigned to an application or an instance if required.

## Device Groups

**Introduced in FlowFuse 1.15**

Device groups allow you to organize your devices into logical groups. These groups can be the target of [DevOps Pipelines](#devops-pipeline), greatly simplifying the deployments to one or hundreds of devices.

Device groups provide logical organization of devices by location, function, environment, or other criteria. They enable simplified mass deployments through DevOps pipelines, allow you to target specific device groups for staged rollouts, and let you manage subsets of devices independently.

Read more [about Device Groups](./device-groups.md).