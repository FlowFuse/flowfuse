# Installing FlowForge

FlowForge can be installed on most Linux distributions, Windows, and MacOS.

It provides three models for how to run and manage the individual Node-RED instances
it creates. Choosing the right model is important based on how you plan to use
the platform.

## Deployment Models

Model      | Description        
-----------|--------------------
[Local](./local/README.md)           | Runs the Node-RED instances on the same machine running the core FlowForge application. The instances are exposed on different TCP ports. This is intended for smaller deployments, such as for evaluation, or personal use.
[Docker](./docker/README.md)         | Run the platform in a Docker Compose based environment.
[Kubernetes](./kubernetes/README.md) | Run the platform in a full Kubernetes based environment.


If you are just getting started with FlowForge and want to evaluate what it can do,
we recommend starting with the [Local model](./local/README.md).

## Upgrading FlowForge

If you are upgrading FlowForge, please refer to the [Upgrade Guide](../upgrade/README.md)
for any specific actions required.
