---
navTitle: OpenShift Installation
meta:
   description: Learn how to install FlowFuse on OpenShift
   tags:
      - flowfuse
      - nodered
      - openshift
      - kubernetes
      - traefik
      - helm
---


# OpenShift Install

This guide walks you through detailed set up of FlowFuse Platform on a container envoronment managed by OpenShift. Typically suited for large on premise deployments or deployment in Cloud infrastructure.
By the end, you will have a fully functioning FlowFuse instance running on a OpenShift cluster.

# Checklist

 <div class="grid grid-cols-2 gap-8">
   <div class="checklist">
     <label>Prerequisites</label>
     <div>
       ::ChecklistItem{task="Domain Name"}
       ::
       ::ChecklistItem{task="OpenShift cluster"}
       ::
       ::ChecklistItem{task="FlowFuse License"}
       ::
       ::ChecklistItem{type="recommended" task="Setup Dedicated Database"}
       ::
       ::ChecklistItem{type="recommended" task="Prepare TLS Certificates"}
       ::
     </div>
   </div>

   <div class="checklist">
     <label>Installation</label>
     <div>
       ::ChecklistItem{task="Download FlowFuse"}
       ::
       ::ChecklistItem{task="Configure FlowFuse"}
       ::
       ::ChecklistItem{type="recommended" task="Enable HTTPS"}
       ::
     </div>
   </div>
 </div>


## Prerequisites

Before you begin, ensure you have the following:

1. **Domain Name & DNS:** A domain name that you own and can configure DNS settings for (explained in [DNS](#dns))
2. **oc:** To manage a OpenShift cluster you will need a copy of the `oc` utility. Instructions on how to install `oc` can be found [here](https://docs.openshift.com/container-platform/4.17/cli_reference/openshift_cli/getting-started-cli.html)
3. **Helm:** FlowFuse provides the Helm chart to manage platform deployment. Installation can be done through the instructions on [their website](https://helm.sh)
4. **OpenShift Cluster:** an OpenShift cluster instance with at least two worker nodes
5. **Ingress Controller:** [The Traefik](https://doc.traefik.io/traefik/) installed on the cluster.
6. **FlowFuse License:** A valid FlowFuse license key is required to run on OpenShift. You can request a quote [here](https://flowfuse.com/pricing/request-quote/)

For a production-ready environment, we also recommend: 
* **Database:** Prepare dedicated database on a external database server (see [FAQ](README.md#how-to-use-external-database-server%3F) for more details)
* **TLS Certificate:** Prepare TLS certificate for your domain and configure FlowFuse platform to use it (see [Enable HTTPS](README.md#i-would-like-to-secure-the-platform-with-https%2C-how-can-i-do-that%3F)) 

### DNS

A [wildcard DNS entry](https://en.wikipedia.org/wiki/Wildcard_DNS_record) will be needed 
to point to the domain that is used for the project instances. This will need to point 
to the Ingress controller.

For example if you want projects to be accessible as `[instance-name].example.com`
you will need to ensure that `*.example.com` is mapped to the IP address used by 
your OpenShift clusters's Ingress controller.

By default the FlowFuse application will be mapped to `forge.example.com` assuming
that you set the domain to `example.com`.

Notes on how to setup DNS can be found [here](../dns-setup.md).

## Installing FlowFuse

### Create project in the OpenShift cluster

To maintain a clean environment, it is recommended to create a new project for the FlowFuse platform:

```bash
oc new-project flowfuse --description="FlowFuse Platform" --display-name="FlowFuse"
```

Describe the project to get the SCC information:

```bash
oc describe project flowfuse
```

Note the `openshift.io/sa.scc.uid-range` and `openshift.io/sa.scc.supplemental-groups` values. You will need to use these values when customizing the FlowFuse platform installation.
In example, if the `openshift.io/sa.scc.uid-range` value is `1000710000/10000`, the `<project-uid>` value will be `1000710000`.

### Add FlowFuse Helm Repository

```bash
helm repo add flowfuse https://flowfuse.github.io/helm
helm repo update
```

### Customize Helm Chart

All the initial configuration is handled by the Helm chart. This is done by creating a `customization.yml` file that will be passed to the Helm along with the chart.

To create `customization.yml` file with a minimal required configuration (replace `example.com` with your domain 
and `<project-uid>` with the value from the project description collected on [project creation step](#create-project-in-the-openshift-cluster)):

```bash
cat <<EOF > customization.yml
forge:
  entryPoint: forge.example.com
  domain: example.com
  https: false
  localPostgresql: true
  cloudProvider: openshift
  podSecurityContext:
    runAsUser: <project-uid>
    runAsGroup: <project-uid>
    fsGroup: <project-uid>

postgresql:
  primary:
    podSecurityContext:
      fsGroup: <project-uid>
    containerSecurityContext:
      runAsUser: <project-uid>
EOF
```
A full list of all the configuration options can be found in the [Helm Chart README](https://github.com/FlowFuse/helm/blob/main/helm/flowfuse/README.md#configuration-values).

### Label Nodes

By default FlowFuse platform expects that worker nodes have specific labels applied. The main reason behind this approach is to separate core application components from Node-RED instances.

You will need to label at least one node to run the management application and one to run the Node-RED Projects:

List all nodes in the cluster:

```bash
oc get nodes
```

Label management nodes:
```bash
oc label node <management-node-name> role=management
```

Label project nodes:
```bash
oc label node <projects-node-name> role=projects
```

To override this behavior, you can remove the node selectors with the following entry in the `customization.yml` file which will mean that all pods can run on any nodes.

```yaml
forge:
  projectSelector:
  managementSelector:
```

## Start FlowFuse Platform

Once you have the `customization.yml` file created, you can install FlowFuse using our Helm chart. This will automatically create all required objects and start services:

```bash
helm upgrade --atomic --install --timeout 10m flowfuse flowfuse/flowforge -f customization.yml
```

## First Run Setup

The first time you access the platform in your browser, it will take you through
creating an administrator for the platform and other configuration options.

For more information, follow [this guide](../first-run.md).

Once you have finished setting up the admin user there are some [Kubernetes specific items to consider](#common-questions).

## Upgrade

All technical aspects of the upgrade process of Flowfuse application running on Kubernetes and managed by Helm chart are maintained in our repository.
Please refer to the [Flowfuse Helm Chart documentation](https://github.com/FlowFuse/helm/blob/main/helm/flowfuse/README.md#upgrading-chart) for more details
about the upgrade process.

## Common Questions

For non-OpenShift specific questions, please refer to the [main kubernetes documentation](README.md#common-questions).

### I would like to use embeded MQTT broker, how can I do that?

<details>
  <summary>Click to expand</summary>

The FlowFuse Helm chart provides the MQTT broker service.

To enable the MQTT broker you need to add the following to the `customization.yml` file 
(replace the `<project-uid>` with the value from the project description collected on [project creation step](#create-project-in-the-openshift-cluster)):

```yaml
forge:
  broker:
    enabled: true
    podSecurityContext:
      runAsUser: <project-uid>
      runAsGroup: <project-uid>
      fsGroup: <project-uid>
```

Apply changes with [platform startup command](#start-flowfuse-platform).

Check the [FlowFuse Helm chart documentation](https://github.com/FlowFuse/helm/tree/main/helm/flowfuse#mqtt-broker) for more details about the parameters that can be configured for the MQTT broker.

</details>

### I would like to use FlowFuse File Storage to store context data, how can I do that?

<details>
  <summary>Click to expand</summary>

To enable the FlowFuse File Storage component add the following to the `customization.yml` file
(replace the `<project-uid>` with the value from the project description collected on [project creation step](#create-project-in-the-openshift-cluster)):

```yaml
forge:
  fileStore:
    enabled: true
    podSecurityContext:
      runAsUser: <project-uid>
      runAsGroup: <project-uid>
      fsGroup: <project-uid>
```

Apply changes with [platform startup command](#start-flowfuse-platform).

Check the [FlowFuse Helm chart documentation](https://github.com/FlowFuse/helm/tree/main/helm/flowfuse#file-storage) for more details about the parameters that can be configured for the File Storage.

</details>
