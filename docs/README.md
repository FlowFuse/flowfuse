---
navTitle: Documentation
meta:
   description: Explore comprehensive documentation for FlowFuse, covering user manuals, API references, Node-RED migration guides, device management, FlowFuse Cloud setup, self-hosted installations, support resources, and contributing to FlowFuse development.
   tags:
      - flowfuse
      - nodered
      - documentation
      - api
      - migration
      - device management
      - cloud
      - self-hosted
      - support
      - contributing
---

# FlowFuse Documentation

FlowFuse adds to Node-RED; collaborative development, management of
remote deployments, support for DevOps delivery pipelines, and the ability to
host Node-RED applications on FlowFuse. FlowFuse is the DevOps platform for
Node-RED application development and delivery.

## FlowFuse User Manuals

 - [User Manual](./user/introduction/) - Documentation on how to use FlowFuse.
 - [API Documentation](./api/)
 - [Node-RED Migration](./migration/introduction/) - How to migrate your Node-RED standalone to FlowFuse?

## Device Agent

The [Device Agent](./device-agent/introduction/) allows you to manage Node-RED instances running on remote Devices. A Device runs a software agent that connects back to FlowFuse in order to receive updates.

- [Install the Device Agent](./device-agent/install/) - Install the Device Agent on your own hardware to remotely manage your Node-RED instances.
- [Registering your Device](./device-agent/register/) - Connecting your Device to the FlowFuse platform.
- [Deploying flows to your Device](./device-agent/deploy/) - Learn how to remotely deploy flows to your Device.
- [Editing flows on your Device](./device-agent/deploy/) - Setup "Developer Mode" to enable editing of your flows, directly on your Device.

## FlowFuse Cloud

[FlowFuse Cloud](./cloud/introduction/) is our hosted service allowing users to sign-up and start creating Node-RED instances without having to install and manage their own instance of FlowFuse.

 - [Network Connections](./cloud/introduction/#network-connections) - Details what connections can and cannot be established to Node-RED instances running in FlowFuse Cloud.
 - [Single Sign On](./cloud/introduction/#single-sign-on) - FlowFuse supports configuring SAML-based Single Sign-On for particular email domains. Contact us to configure for your team.
 - [Billing](./cloud/billing/) - find out how we've configured FlowFuse for FlowFuse Cloud.

## FlowFuse Self-Hosted

You can run the FlowFuse platform for yourself. This guide will help you get setup
in no time.

- [Installing FlowFuse](./install/introduction/) - how to install the platform
- [Upgrade your FlowFuse Instance](./upgrade/)
- [From Open Source to Premium](./upgrade/open-source-to-premium.md) - How to add your license to the platform
- [Administrator Manual](./admin/introduction.md) - How to administer the platform

## How to get support?

- [Troubleshooting](/docs/debugging/)
- [Community Support](https://community.flowfuse.com/)
- [FlowFuse Cloud Support](/docs/premium-support/)

 ## Contributing to FlowFuse
 - [Useful Information](./contribute/introduction/#contributing-to-flowfuse) - Learn the foundational concepts of how FlowFuse is built & structured. 
 - [Development Setup](./contribute/introduction/#development-setup) - Configure your local development environment to contribute to FlowFuse.
 - [Testing](./contribute/introduction/#testing) - Understand our testing philosophy at FlowFuse.
