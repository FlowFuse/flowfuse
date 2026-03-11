---
navTitle: Digital Ocean Kubernetes Installation
meta:
   description: Install FlowFuse on Digital Ocean Kubernetes with cluster setup, Traefik, SSL using Cert-manager, and Helm deployment.
   tags:
      - flowfuse
      - nodered
      - digitalocean
      - kubernetes
      - traefik
      - cert-manager
      - helm
      - dns
      - letsencrypt
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

## Install Traefik

Prepare values for the Traefik Helm chart by creating a file called `traefik-values.yaml` with the following content:

```yaml
service:
  enabled: true
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol: "true"
  spec:
    externalTrafficPolicy: Cluster

deployment:
  replicas: 2

ports:
  web:
    port: 8000
    expose:
      default: true
    exposedPort: 80
    protocol: TCP
    forwardedHeaders:
      trustedIPs:
        - "10.0.0.0/8"
    proxyProtocol:
      trustedIPs:
        - "10.0.0.0/8"
  websecure:
    port: 8443
    expose:
      default: true
    exposedPort: 443
    protocol: TCP
    http:
      middlewares:
        - traefik-force-https@kubernetescrd
        - traefik-large-body@kubernetescrd
      # Disable TLS since NLB handles termination
      tls:
        enabled: false
    forwardedHeaders:
      trustedIPs:
        - "10.0.0.0/8"
    proxyProtocol:
      trustedIPs:
        - "10.0.0.0/8"

ingressClass:
  enabled: true
  isDefaultClass: false
  name: traefik

additionalArguments:
  - "--entryPoints.web.proxyProtocol.insecure=true"
  - "--entryPoints.websecure.proxyProtocol.insecure=true"
  - "--entryPoints.web.forwardedHeaders.insecure=true"
  - "--entryPoints.websecure.forwardedHeaders.insecure=true"

providers:
  kubernetesIngress:
    enabled: true
  kubernetesCRD:
    enabled: true

api:
  dashboard: false
  insecure: false

logs:
  access:
    enabled: true
    fields:
      headers:
        defaultMode: keep

extraObjects:
  - apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: force-https
      namespace: traefik
    spec:
      headers:
        customRequestHeaders:
          X-Forwarded-Proto: "https"
  - apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: large-body
      namespace: traefik
    spec:
      buffering:
        maxRequestBodyBytes: 10485760
```

Install the Traefik with the following command:

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm --kubeconfig=./k8s-flowforge-kubeconfig.yaml upgrade --install traefik traefik/traefik \
  --create-namespace \
  -n traefik \
  -f traefik-values.yaml \
  --wait \
  --atomic
```

### Setup DNS

Run the following to get the external IP address of the Traefik controller

```bash
kubectl --kubeconfig=./k8s-flowforge-kubeconfig.yaml \
  -n traefik get service traefik
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
            ingressClassName: traefik
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
