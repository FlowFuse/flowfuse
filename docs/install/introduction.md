---
navTitle: Overview
navOrder: 1
---
# Installing FlowFuse

FlowFuse can be installed on most Linux distributions, Windows, and MacOS.

It provides three models for how to run and manage the individual Node-RED instances
it creates. Choosing the right model is important based on how you plan to use
the platform.

## One-Click Docker Installer

<a href="https://marketplace.digitalocean.com/apps/flowforge"><img src="https://upload.wikimedia.org/wikipedia/commons/f/ff/DigitalOcean_logo.svg"  width="150" height="75"></a>

See also the [Digital Ocean Step by Step Manual](./docker/digital-ocean.md)

<br>
<a href="https://aws.amazon.com/marketplace/pp/prodview-3ycrknfg67rug?sr=0-1&ref_=beagle&applicationId=AWSMPContessa"><img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"  width="150" height="75"></a>

See also the AWS Step by Step Manual

## Deployment Models

Model      | Description        
-----------|--------------------
[Local](./local/README.md)           | Runs the Node-RED instances on the same machine running the core FlowFuse application. The instances are exposed on different TCP ports. This is intended for smaller deployments, such as for evaluation, or personal use.
[Docker](./docker/README.md)         | Run the platform in a Docker Compose based environment.
[Kubernetes](./kubernetes/README.md) | Run the platform in a full Kubernetes based environment.


If you are just getting started with FlowFuse and want to evaluate what it can do,
we recommend starting with the [Local model](./local/README.md).

## Upgrading FlowFuse

If you are upgrading FlowFuse, please refer to the [Upgrade Guide](../upgrade/README.md)
for any specific actions required.
