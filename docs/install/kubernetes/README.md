---
navTitle: Install FlowFuse on Kubernetes
meta: 
   description: Install FlowFuse on Kubernetes using Helm charts for easy configuration and management. Ensure efficient data storage and enable MQTT broker integration seamlessly.
   tags:
      - kubernetes
      - helm
      - postgresql
      - dns
      - email
      - mqtt
---

<script>     
    class ChecklistItem extends HTMLElement {

       static observedAttributes = ["type", "task"];

       constructor() {
          super();   
          this.type = 'required'
          this.task = ''
       }

       attributeChangedCallback(name, oldValue, newValue) {
         if (name === "type") {
             this.type = newValue;
         } else if (name === "task") {
             this.task = newValue;
         }
       }

       connectedCallback () {
         const iconRequired = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`
         const iconRecommended = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" /></svg>`
         const iconOptional = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`

         let icon = iconRequired
         let tooltip = "Required for Operation"
         if (this.type === 'recommended') {
           icon = iconRecommended
           tooltip = "Recommended for Production"
         } else if (this.type === 'optional') {
           icon = iconOptional
           tooltip = "Optional"
         }
         this.innerHTML = `<div class="checklist-item checklist-item--${this.type}"><span class="tooltip" data-tooltip="${tooltip}"><span class="checklist-item-status">${icon}</span><span>${this.task}</span></span></div>`
       }
    }

    customElements.define('checklist-item', ChecklistItem);
 </script>

# Kubernetes Install

This guide walks you through detailed set up of FlowFuse Platform on a container envoronment managed by Kubernetes. Typically suited for large on premise deployments or deployment in Cloud infrastructure.
By the end, you will have a fully functioning FlowFuse instance running on a Kubernetes cluster.

# Checklist

 <div class="grid grid-cols-2 gap-8">
   <div class="checklist">
     <label>Prerequisites</label>
     <div>
       <checklist-item task="Domain Name"></checklist-item>
       <checklist-item task="Kubernetes cluster"></checklist-item>
       <checklist-item type="recommended" task="Setup Dedicated Database"></checklist-item>
       <checklist-item type="recommended" task="Prepare TLS Certificates"></checklist-item>
     </div>
   </div>

   <div class="checklist">
     <label>Installation</label>
     <div>
       <checklist-item task="Download FlowFuse"></checklist-item>
       <checklist-item task="Configure FlowFuse"></checklist-item>
       <checklist-item type="recommended" task="Enable HTTPS"></checklist-item>
     </div>
   </div>
 </div>


## Prerequisites

Before you begin, ensure you have the following:

1. **Domain Name & DNS:** A domain name that you own and can configure DNS settings for (explained in [DNS](#dns))
2. **kubectl:** To manage a Kubernetes cluster you will need a copy of the `kubectl` utility. Instructions on how to install it can be found [here](https://kubernetes.io/docs/tasks/tools/)
3. **Helm:** FlowFuse provides the Helm chart to manage platform deployment. Installation can be done through the instructions on [their website](https://helm.sh)
4. **Kubernetes Cluster:** The deployment has currently been tested on the following environments:
     - [AWS EKS](aws_terraform.md)
     - [Digital Ocean](digital-ocean.md)
     - MicroK8s
5. **Ingress Controller:** An Ingress controller installed on the kubernetes cluster. FlowFuse Helm chart uses the [Ingress NGINX Controller](https://github.com/kubernetes/ingress-nginx) by default.

For a production-ready environment, we also recommend: 
* **Database:** Prepare dedicated database on a external database server (see [FAQ](#how-to-use-external-database-server%3F) for more details)
* **TLS Certificate:** Prepare TLS certificate for your domain and configure FlowFuse platform to use it (see [Enable HTTPS](#enable-https-optional))

### DNS

A [wildcard DNS entry](https://en.wikipedia.org/wiki/Wildcard_DNS_record) will be needed 
to point to the domain that is used for the project instances. This will need to point 
to the kubernetes Ingress controller.

For example if you want projects to be accessible as `[instance-name].example.com`
you will need to ensure that `*.example.com` is mapped to the IP address used by 
your Kubernetes clusters's Ingress controller.

By default the FlowFuse application will be mapped to `forge.example.com` assuming
that you set the domain to `example.com`.

Notes on how to setup DNS can be found [here](../dns-setup.md).

## Installing FlowFuse

### Add FlowFuse Helm Repository

```bash
helm repo add flowfuse https://flowfuse.github.io/helm
helm repo update
```

### Customize Helm Chart

All the initial configuration is handled by the Helm chart. This is done by creating a `customization.yml` file that will be passed to the Helm along with the chart.

To create `customization.yml` file with a minimal required configuration (replace `example.com` with your domain):

```bash
cat <<EOF > customization.yml
forge:
  entryPoint: forge.example.com
  domain: example.com
  https: false
  localPostgresql: true
EOF
```

### Label Nodes

By default FlowFuse platform expects that Kubernetes nodes have specific labels applied. The main reason behind this approach is to separate core application components from Node-RED instances.

You will need to label at least one node to run the management application and one to run the Node-RED Projects:

List all nodes in the cluster:

```bash
kubectl get nodes
```

Label management nodes:
```bash
kubectl label node <management-node-name> role=management
```

Label project nodes:
```bash
kubectl label node <projects-node-name> role=projects
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
Please refer to the [Flowfuse Helm Chart documentation](https://github.com/FlowFuse/helm/blob/main/helm/flowforge/README.md#upgrading-chart) for more details
about the upgrade process.

## Common Questions

### I would like to secure the platform with HTTPS, how can I do that?

In cloud environments, it is recommended to use a Load Balancer to terminate SSL traffic.

However, if you want to use SSL termination on the Kubernetes Ingress Controller, this is possible by utilizing [Cert-Manager](https://cert-manager.io/docs/) tool (not part of the FlowFuse Helm chart).

Once you have Cert-Manager installed, you can enable TLS support in the `customization.yml` file by specifying the [ClusterIssuer](https://cert-manager.io/docs/configuration/#cluster-resource-namespace) name:

```yaml
ingress:
  clusterIssuer: <your-cluster-issuer>
```

Apply changes with [platform startup command](#start-flowfuse-platform).

### How to use external database server?

FlowFuse platform uses PostgreSQL database to store its data. By default, the internal database instance is created and managed by the Helm chart. 

If you want to use an external database server, you need to edit `customization.yml` file and provide the database connection details:

```yaml
forge:
  localPostgresql: false # Disable internal database
postgresql:
  host: <database-host>
  port: <database-port>
  auth:
    username: <database-username>
    password: <database-password>
    database: <database-name>
```

Apply changes with [platform startup command](#start-flowfuse-platform).

Check the [FlowFuse Helm chart documentation](https://github.com/FlowFuse/helm/tree/main/helm/flowforge#postgresql) for more details about the parameters that can be configured for the PostgreSQL database.

### How to backup embedded database?

If you are using the internal database (value `forge.localPostgresql` set to `true`), you can use Kubernetes [CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) to backup the database.

Apply below `CronJob` and `PersistentVolumeClaim` definitions to create a backup job which will be executed every day at 23:05 and store the backup in a PVC named `db-backup-pvc`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-backup-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "5 23 * * *"
  jobTemplate:
    spec:
      ttlSecondsAfterFinished: 60
      template:
        metadata:
          labels:
            app: flowforge
        spec:
          containers:
          - name: backup
            image: postgres
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: flowfuse-postgresql
                  key: postgres-password
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -h flowfuse-postgresql -U postgres -d flowforge -F c -b -v -f /backup/db_backup.dump
            volumeMounts:
            - name: backup-volume
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-volume
            persistentVolumeClaim:
              claimName: db-backup-pvc
```

### I would like to invite my team members to the platform with e-mail, how can I do that?

FlowFuse platform allows you to invite team members to the platform using their e-mail addresses.
To enable this feature, you need to configure the e-mail settings in the `customization.yml` file.

Check this [page](../configuration.md#email-configuration) for more details about the parameters. 
Check [FlowFuseHelm chart documentation](https://github.com/FlowFuse/helm/tree/main/helm/flowforge#email) for information where configuration values should be placed in `customization.yml` file.

If you use AWS EKS (Elastic Kubernetes Service) and want to use AWS SES (Simple Email Service) for sending e-mails, you need to provide the IAM role with the required permissions to use SES.

```yaml
forge:
  entryPoint: forge.example.com
  domain: example.com
  cloudProvider: aws
  aws:
    IAMRole: arn:aws:iam::<aws-account-id>:role/flowforge_service_account_role
  email:
    ses:
      region: eu-west-1
``` 

Apply changes with [platform startup command](#start-flowfuse-platform).
### I would like to use embeded MQTT broker, how can I do that?

<details>
  <summary>Click to expand</summary>

The FlowFuse Helm chart provides the MQTT broker service.

To enable the MQTT broker you need to add the following to the `customization.yml` file:

```yaml
forge:
  broker:
    enabled: true
```

Apply changes with [platform startup command](#start-flowfuse-platform).

Check the [FlowFuse Helm chart documentation](https://github.com/FlowFuse/helm/tree/main/helm/flowforge#mqtt-broker) for more details about the parameters that can be configured for the MQTT broker.

</details>

### I would like to use Kubernetes Persistent storage to store data, how can I do that?

Starting with the `2.6.0` release the Pods running the Node-RED Instances have a Persistent Volume mounted on `/data/storage` in which files can be written. 
These files will persist for the lifetime of the Instance including across Susspend/Resume and Stack upgrades.

To enable this feature the following configuration needs to be added to the `customization.yml` file (replace '<storage-class-name>' with the name of the StorageClass you have in the cluster):

```yaml
forge:
  persistentStorage:
    enabled: true
    size: 5Gi
    storageClass: <storage-class-name>
```

Apply changes with [platform startup command](#start-flowfuse-platform).

### I would like to use FlowFuse File Storage to store context data, how can I do that?

To enable the FlowFuse File Storage component add the following to the `customization.yml` file:

```yaml
forge:
  fileStore:
    enabled: true
```

Apply changes with [platform startup command](#start-flowfuse-platform).

Check the [FlowFuse Helm chart documentation](https://github.com/FlowFuse/helm/tree/main/helm/flowforge#file-storage) for more details about the parameters that can be configured for the File Storage.

### I would like to run FlowFuse on AWS EKS. Do you have any guidance?

Yes, we have a dedicated guide on how to deploy FlowFuse on AWS EKS. You can find it [here](aws.md).
Furthermore, we also provide terraform scripts to automate the deployment process of all required AWS service. You can find the guide [here](aws_terraform.md).
