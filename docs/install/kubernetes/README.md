# Kubernetes Install

This version of the FlowForge platform is intended for running in the Kubernetes (sometimes referred to as K8s)
Container management system. Typically suited for large on permise deployments or deployment in Cloud infrastucture.

### Prerequisites

#### Kubernetes

You will need a Kubernetes environment. The deployment has currently been tested on the following environments:

 - AWS EKS
 - MicroK8s

 It should run on any Kubernetes platform, but may require some changes for vendor specific Ingress setup.

 By default the Helm chart assumes that the Kubernetes cluster has at least 2 nodes:

 1. Used to run the FlowForge management infrastructor
 2. Used to run the Node-RED Project instances

These are assigned using node labels as follows:

FlowForge management
```
kubectl label node <management node name> role=management
```
Node-RED projects
```
kubectl label node <projects node name> role=projects
```

It is possible to run on a single node cluster by overiding the values of `forge.managementSelector` and `forge.projectSelector` when configuring the Helm chart. Details are in the Configuring FlowForge section below.

#### Helm

FlowForge uses a Helm Chart to manage deployment. Installation can be done
through the instructions on [their website](https://helm.sh).

#### Docker Container Registry

FlowForge on Kubernetes will require a Docker Container Registry to host both
the core platform container and the containers that back any Node-RED stacks you
wish to deploy.

You can use [Dockers public registry](https://hub.docker.com). If you do, make
sure you create two repositories: `forge-k8s` and `node-red` under your namespace.
Also ensure you're signed in locally by running `docker login` in your terminal.

#### PostgreSQL Database

The Helm chart can either install a dedicated PostgreSQL database into the same K8s cluster or can configure the install to use an external instance.

#### DNS

A wildcard DNS entry will be needed to point to the domain that is used fro the project instances. This will need to point to the K8s Ingress controller.

#### Email

Some features require the ability to send email to users. This can be currently be provided by:

- Details of a SMTP server
- AWS SES

### Installing FlowForge

#### Download

Download the [FlowForge Helm Charts](https://github.com/flowforge/helm/archive/refs/heads/main.zip)
and extract the ZIP archive.

#### Building Containers

At a minimum there are 2 container required.

 - flowforge/forge-k8s
 - flowforge/node-red

These can be built using the `./build-containers.sh` script in the root of the
`helm` repository. This script takes the hostname of the Docker Container
Registry as it's only argument. This will be pre-pended to the constainer names.
For example:

```
./build-containers.sh containers.example.com
```

This will build two containers

- containers.example.com/flowforge/forge-k8s:<current-version>
- containers.example.com/flowforge/node-red:<current-version>

If you're using Dockers Hub you need to create two repositories: `forge-k8s` and
`node-red`. When done retag and push the containers:

```
docker tag containers.example.com/flowforge/forge-k8s:<current-version> <your-docker-username>/forge-k8s:<current-version>
docker tag containers.example.com/flowforge/forge-k8s:<current-version> <your-docker-username>/forge-k8s:<current-version>

docker login

docker push <your-docker-username>/forge-k8s:<current-version>
docker push <your-docker-username>/node-red:<current-version>
```

##### flowforge/forge-k8s

This container includes the FlowForge application and the Kubernetes drivers.

##### flowforge/node-red

This is the default Node-RED image with the FlowForge components needed to talk
to the FlowForge Platform. This is the basis for the initial [Node-RED stack][stacks].

This is the container you can customise for your deployment.

### Configure FlowForge

All the initial configuration is handled by the Helm chart. This is done by creating a `customization.yml` file in the `helm` directory that will be passed to the helm along with the chart.

This is the minimal configuration

```yaml
forge:
  entryPoint: forge.example.com
  domain: example.com
  https: false
  registry: containers.example.com
  registrySecret: password
  localPostgresql: true
```

When running on AWS EKS and using AWS SES for email (The IAMRole needs to have the required permissions to use SES) it would look something like:

```yaml
forge:
  entryPoint: forge.example.com
  domain: example.com
  registry: <aws-account-id>.dkr.ecr.eu-west-1.amazonaws.com
  cloudProvider: aws
  aws:
    IAMRole: arn:aws:iam::<aws-account-id>:role/flowforge_service_account_role
  email:
    ses:
      region: eu-west-1
```

A more detailed example for running on AWS can be found [here](aws.md)

As mentioned earlier the Helm chart defaults to expecting at least 2 nodes in the Kubernetes cluster. To overide this you can remove the node selectors with the following which will mean that all pods can run on any nodes.

```yaml
forge:
  projectSelector:
  managementSelector:
```

A full list of all the configable values can be found in the [Helm Chart README](https://github.com/flowforge/helm/blob/main/helm/flowforge/README.md).

The install can then be started with the following command, should be run from the `helm` dirctory:

```
helm upgrade --install flowforge flowforge -f customization.yml
```

#### Enabling the MQTT broker

To enable the MQTT broker with Kubernetes install you need to add the following to the `customization.yml` file

```
forge:
  broker:
    url: mqtt://forge:1883
```

The `forge.broker.public_url` value will be generated by prepending `ws://mqtt` to the supplied `forge.domain` value.

#### Using FlowForge File Storage

FlowForge projects when running in Kubernetes do not have direct 
access to a persistent file system to store files.

We recomend disabling the Node-RED core file nodes in the FlowForge
Template.

<img src="../images/file-node-template.png" width=500 />

Adding `10-file.js` to the list of "Excluded nodes by filename" section will ensure that the core file nodes are not loaded by the project.

FlowForge File Nodes provide a solution to this for basic read/write.
More details can be found [here](../file-storage/).

### Running FlowForge

### First Run Setup

The first time you access the platform in your browser, it will take you through
creating an administrator for the platform and other configuration options.

For more information, follow [this guide](../first-run.md).

[stacks]: ../../admin/README.md
