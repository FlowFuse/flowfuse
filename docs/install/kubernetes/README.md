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

At a minimum there are 2 container required.

 - flowforge/forge-k8s
 - flowforge/node-red

These can be built usinth the `./build-containers.sh` script in the root of the `helm` project. This script takes the hostname of the Docker Container Registry as it's only argument. This will be pre-pended to the constainer names.

##### flowforge/forge-k8s

This container includes the FlowForge App and the Kubernetes Drivers

##### flowforge/node-red

This is a basic Node-RED image with the FlowForge Launcher and the required Node-RED plugins to talk to the FlowForge Platform. This is the basis for the initial Stack.

This is the container you can customise for your deployment.


### Configure FlowForge

### SSL (optional)

### Running FlowForge

### First Run Setup

The first time you access the platform in your browser, it will take you through
creating an administrator for the platform and other configuration options.

For more information, follow [this guide](../first-run.md).
