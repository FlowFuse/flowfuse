---
navTitle: Digital Ocean Kubernetes Installation
---

# Installing FlowFuse on a Digital Ocean Kubernetes cluster

## Prerequisites

### Digital Ocean Account

You will need an active Digital Oceans Account, you can sign up
for an account [here](https://cloud.digitalocean.com/registrations/new)

### Utilities

- kubectl - https://kubernetes.io/docs/tasks/tools/
- helm - https://helm.sh/docs/intro/install/

### DNS

You will need a domain that FlowFuse will run on and access to configure
a wildcard entry for that domain in it's root DNS server.

In this guide I will use `example.com` as the domain, remember to substitute your domain.

## Create Cluster

- Click on the big green "Create" button at the top of the screen
- Select "Kubernetes" from the list
- Pick a suitable region (normally the one physically closest to you)
- Reduce the number of nodes from 3 to 2
- Reduce the "Node Plan" to 1GB Ram/2vCPU
- Change the cluster name to `k8s-flowforge`
- Hit "Create Cluster" button

When the cluster has finished provisioning you should be able to download
the `k8s-flowforge-kubeconfig.yaml` file which will allow you to connect to the cluster.

## Install Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm --kubeconfig=./k8s-flowforge-kubeconfig.yaml install nginx-ingress \
  ingress-nginx/ingress-nginx --namespace ingress-nginx \
  --create-namespace \
  --set controller.publishService.enabled=true \
  --set controller.ingressClassResource.default=true \
  --set controller.config.proxy-body-size="0" \
  --wait

```

The `controller.config.proxy-body-size="0"` removes the `1m` default payload limit 
from the nginx ingress proxy. You can change this to say `5m` which will match the 
Node-RED default value.

### Setup DNS

Run the following to get the external IP address of the Nginx Ingress 
Controller

```bash
kubectl --kubeconfig=./k8s-flowforge-kubeconfig.yaml \
  -n ingress-nginx get service nginx-ingress-ingress-nginx-controller
```

You will need to update the entry in your DNS server to point 
`*.example.com` to the IP address listed under `EXTERNAL-IP`

## Install Cert-manager

This will use LetsEncrypt to issue certificates for both the FlowFuse application
but also for the Node-RED instances.

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install \
  --kubeconfig=./k8s-flowforge-kubeconfig.yaml \
  cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version v1.13.3 \
  --set installCRDs=true
```

After installing you will need to create a `ClusterIssuer` to access LetsEncrypt.

Create the following YAML file called `letsencrypt.yml`, please replace 
`user@example.com` with your email address.

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt
spec:
  acme:
    # The ACME server URL
    server: https://acme-v02.api.letsencrypt.org/directory
    # Email address used for ACME registration
    email: user@example.com
    # Name of a secret used to store the ACME account private key
    privateKeySecretRef:
      name: letsencrypt-prod
    # Enable the HTTP-01 challenge provider
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
```

Then use `kubectl` to install this

```bash
kubectl --kubeconfig=./k8s-flowforge-kubeconfig.yaml apply -f letsencrypt.yml
```

## Install FlowFuse

Then setup the FlowFuse Helm repository

```bash
helm repo add flowforge https://flowfuse.github.io/helm
helm repo update
```

Now create a `customizations.yml` file. This is how we configure the 
FlowFuse instance.

The following is the bare minimum to get started:

```yaml
forge:
  domain: example.com
  https: true
  localPostgresql: true
  projectSelector: 
  managementSelector: 
  broker:
    enabled: true
postgresql:
  global:
    storageClass: do-block-storage
ingress:
  certManagerIssuer: letsencrypt
```

Again, please replace `example.com` with the domain you configured
earlier in the [Setup DNS](#setup-dns) section

Then we use this to install FlowFuse

```bash
helm upgrade --install --kubeconfig ./k8s-flowforge-kubeconfig.yaml \
  flowforge flowforge/flowforge -f customizations.yml \
  --wait
```

Once complete you should be able to sign into the FlowFuse setup wizard 
at `http://forge.example.com`
