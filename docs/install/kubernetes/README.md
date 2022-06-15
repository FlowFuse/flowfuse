# Kubernetes Install

This version of the FlowForge platform is intended for running in the Kubernetes Container management system. Typically suited for large on permise deployments or deployment in Cloud infrastucture.

### Prerequisites

#### Kubernetes

You will need a Kubernetes environment. The deployment has currently been tested on the following environments:

 - AWS EKS
 - MicroK8s

 It should run on any Kubernetes platform, but may require some changes for vendor specific Ingress setup.

#### Helm

FlowForge uses a Helm Chart to manage deployment

#### Docker Container Registry

FlowForge on Kubernetes will require a Docker Container Registry to host the both the core platform container and the containers that back any Stacks you wish to deploy.

#### DNS

### Installing FlowForge

#### Download

Download the helm project from GitHub here:

https://github.com/flowforge/helm/

#### Building Containers

##### flowforge/forge-k8s

##### flowforge/node-red

### Configure FlowForge

### SSL (optional)

### Running FlowForge

### First Run Setup

The first time you access the platform in your browser, it will take you through
creating an administrator for the platform and other configuration options.

For more information, follow [this guide](../first-run.md).
