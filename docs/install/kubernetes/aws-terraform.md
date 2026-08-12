---
navTitle: AWS EKS Installation with Terraform and Helm
meta:
   description: Learn to deploy FlowFuse on AWS EKS using Terraform and Helm. Setup VPC, EKS, RDS, Route53, SES, and  Traefik step-by-step.
   tags:
     - flowfuse
     - nodered
     - aws
     - eks
     - terraform
     - helm
     - kubernetes
     - cloud deployment
     - aws setup
     - kubernetes deployment
---

# FlowFuse-oriented infrastructure in AWS using Terraform and Helm

This step-by-step guide will help you use the Terraform modules available in the FlowFuse repository to setup resources required to run FlowFuse platform on AWS.
After following the commands in this documentation, the following resources will be created:

- <a href="https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html" target="_blank">VPC</a>
- <a href="https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html" target="_blank">EKS</a> (Elastic Kubernetes Service)
- <a href="https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html" target="_blank">RDS</a> (Relational Database Service)
- <a href="https://docs.aws.amazon.com/vpc/latest/userguide/vpc-peering.html" target="_blank">VPC Peering</a>
- <a href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html" target="_blank">Route53</a> domain zone
- <a href="https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html" target="_blank">AWS Certificate</a>
- <a href="https://docs.aws.amazon.com/ses/latest/DeveloperGuide/Welcome.html" target="_blank">SES</a> (Simple Email Service)

The full list of the resources created by each module can be found in the documentation of the respective modules.
To ensure proper infrastructure deployment, these modules must be executed in a specific order: `vpc`, `eks`, `rds`, `vpc-peering`, `route53` and `ses`. 
Additionally, a shared variables file (`terraform.tfvars`) will be created to manage configuration used by all modules.

While Terraform supports nested modules for complex infrastructure, this guide will treat each module as a root module for simplicity.
All modules are configurable, allowing you to customize the infrastructure to meet your specific needs. Detailed information on configuring each module can be found in its documentation.
This guide will uses minimal configuration to demonstrate the basic setup.

## Prerequisites

- <a href="https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli" target="_blank">Terraform</a>, <a href="https://kubernetes.io/docs/tasks/tools/#kubectl" target="_blank">kubectl</a>, <a href="https://helm.sh/docs/helm/helm_install/" target="_blank">Helm</a> and
  <a href="https://git-scm.com/book/en/v2/Getting-Started-Installing-Git" target="_blank">git</a> installed on your machine.
- Access to an AWS account through <a href="https://repost.aws/knowledge-center/create-access-key" target="_blank">AWS access key</a>, that allows the creation of new resources. The specific resources created by each module are detailed in the documentation of the respective modules.

## Step 1: Clone the Repository

First, clone the FlowFuse Terraform repository to your local machine:

```bash
git clone https://github.com/FlowFuse/terraform-aws-flowfuse.git
cd terraform-aws-flowfuse
```

## Step 2: Set AWS Environment Variables

Set the following environment variables to authenticate Terraform with your AWS account:

```bash
export AWS_ACCESS_KEY_ID=<your-access-key-id>
export AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
export AWS_REGION=<your-desired-region>
```

Replace `<your-access-key-id>`, `<your-secret-access-key>`, and `<your-desired-region>` with your actual AWS credentials and desired AWS region. All resources must be created in the same region.

For example, if you want to create resources in `us-west-2`, set the region as follows:

```bash
export AWS_REGION=us-west-2
```

Ensure that these environment variables are set for the duration of the session or included in your shell profile to persist across sessions.

## Step 3: Create the `terraform.tfvars` File

Create a `terraform.tfvars` file in the root directory of the repository. This file will contain the shared variables for all the modules.

```bash
touch terraform.tfvars
```

Edit the `terraform.tfvars` file and add the following content.
Replace `<aws-user-arn>` with the <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html" target="_blank">ARN</a> of the AWS user that will have access to the EKS cluster. This user will be granted the `ClusterAdmin` role in the EKS cluster.

```hcl
namespace = "my-company"
stage     = "production"
route53_zone_name = "my-domain.com"
eks_access_entry_map = {
    "<aws-user-arn>" = {
      access_policy_associations = {
        ClusterAdmin = {}
      }
    }
  }
```

## Step 4: Create AWS Resources

**The order of creating resources is important. The documentation specifies the correct order. Attempts to create resources in a different order may fail.**

### 1. VPC Module

To create basic networking, initialize the VPC module:

```bash
terraform -chdir=vpc init
```

Apply the VPC module using the shared variables file:

```bash
terraform -chdir=vpc apply -var-file=../terraform.tfvars
```

### 2. EKS Module

To create EKS cluster, initialize the EKS module:

```bash
terraform -chdir=eks init
```

Apply the EKS module using the shared variables file:

```bash
terraform -chdir=eks apply -var-file=../terraform.tfvars
```

### 3. RDS Module

To create RDS database, initialize the RDS module:

```bash
terraform -chdir=rds init
```

Apply the RDS module using the shared variables file:

```bash
terraform -chdir=rds apply -var-file=../terraform.tfvars
```

### 4. VPC Peering Module

To create a peering between EKS and RDS networks, initialize the VPC Peering module:

```bash
terraform -chdir=vpc-peering init
```

Apply the VPC Peering module using the shared variables file:

```bash
terraform -chdir=vpc-peering apply -var-file=../terraform.tfvars
```

### 5. Route53 Module

To create a domain and certificate, initialize the Route53 module:

```bash
terraform -chdir=route53 init
```

Apply the Route53 module using the shared variables file:

```bash
terraform -chdir=route53 apply -var-file=../terraform.tfvars
```

Remember to change NS records in your domain registrar to the ones provided by the Route53 module.
NS records are printed after the Route53 module is applied.
They can be also printed using the following command:

```bash
terraform -chdir=route53 output domain_dns_records
```

### 6. SES Module

To create an email service, initialize the SES module:

```bash
terraform -chdir=ses init
```

Apply the SES module using the shared variables file:

```bash
terraform -chdir=ses apply -var-file=../terraform.tfvars
```

To get the IAM role ARN created by the SES module and required during [FlowFuse platform configuration](/docs/install/configuration.md#aws-ses-email), run the following command:

```bash
terraform -chdir=eks output flowfuse_role_arn
```

## Step 5: Deploy Traefik

It is recommended to run the <a href="https://doc.traefik.io/traefik/" target="_blank">Traefik</a> even on AWS EKS (The AWS ALB load balancer currently appears to only support up to 100 Ingress Targets which limits the number of Hosted Instances that can be run).

Create a `traefik-values.yaml` file for Traefik configuration:

```bash
touch traefik-values.yaml
```

Get the certificate ARN (`<your-certificate-arn>`) from the `route53` module outputs:

```bash
terraform -chdir=route53 output acm_certificate_arn
```

Fill the `traefik-values.yaml` file with the following content. Replace `<your-certificate-arn>` with the certificate ARN.

```yaml
service:
  enabled: true
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-proxy-protocol: "*"
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "<your-certificate-arn>"
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
    service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout: "120"
    service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: "proxy_protocol_v2.enabled=true"
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

Update your kubeconfig file to point to the EKS cluster and set the correct context

```bash
aws eks update-kubeconfig --name $(terraform -chdir=eks output -raw cluster_name)
```

Install the Traefik Ingress controller with the following command:

```bash
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm upgrade --install traefik traefik/traefik \
  --create-namespace \
  -n traefik \
  -f traefik-values.yaml \
  --wait \
  --atomic
```


## Conclusion

You have successfully set up the necessary AWS infrastructure to run the FlowFuse platform and performed minimal EKS cluster configuration required.
With this infrastructure in place, your environment is now ready for the installation of the FlowFuse platform. For detailed installation instructions, please visit: [FlowFuse Kubernetes Installation Guide](./README.md).


