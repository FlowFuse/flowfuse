---
navTitle: AWS EKS Installation
meta:
   description: Learn how to install FlowFuse on AWS EKS with setup details for EKS, Traefik, AWS SES, and RDS PostgreSQL integration.
   tags:
      - flowfuse
      - nodered
      - aws
      - eks
      - traefik
      - helm
      - rds postgresql
      - kubernetes
---

# AWS EKS Specific details

This document includes details of installing FlowFuse on AWS EKS.

The following assumptions have been made in the examples:

 1. The user has the correct AWS IAM policy access to complete all tasks
 2. All AWS services are running in `eu-west-1`

## Prerequisites

### AWS Cli

This is used to interact with the whole AWS environment

https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

From here onwards this document assumes that you have configured the 
AWS CLI tools with a user that has permission to carry out the steps.

This document does not include details of how to configure such a user
in AWS IAM. Please show this document to you AWS Account Admin if you
need help.

### eksctl

This tool is used to create/modify AWS EKS Clusters, it uses the credentials from the AWS Cli.

https://docs.aws.amazon.com/eks/latest/userguide/eksctl.html

## Setup a new domain on Route53

Do this in the AWS Console/Your DNS provider

## Create an AWS Certificate
Request a certificate for `*.[DOMAIN]` from Amazon Certificate Manager

Do this in AWS Console, with Route53 validation

## Create EKS Cluster
Edit the `cluster.yml` file in `aws_eks` to set your preferred instance type and count along with AWS Region

```bash
eksctl create cluster -f cluster.yml
```

Example cluster.yml (Please visit [eksctl.io](https://eksctl.io/usage/creating-and-managing-clusters/#using-config-files) to be sure you understand what this does.)
```yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: FlowFuse
  region: eu-west-1

iam:
  withOIDC: true

addons:
  - name: aws-ebs-csi-driver
    resolveConflicts: overwrite

nodeGroups:
  - name: management
    labels:
      role: "management"
    instanceType: t2.small
    desiredCapacity: 1
    volumeSize: 20
    ssh:
      allow: false
    iam:
      withAddonPolicies:
        ebs: true
  - name: instance
    labels: 
      role: "projects"
    tags:
      k8s.io/cluster-autoscaler/enabled: "true"
      k8s.io/cluster-autoscaler/flowforge: "owned"
    instanceType: t2.small
    desiredCapacity: 2
    volumeSize:
    ssh:
      allow: false
```

## Ingress Controller

### Traefik

It is recommended to run the <a href="https://doc.traefik.io/traefik/" target="_blank">Traefik</a> even on AWS EKS (The AWS ALB load balancer currently appears to only support up to 100 Ingress Targets which limits the number of Hosted Instances that can be run).

Create a `traefik-values.yaml` file to pass the values to the Traefik helm file.

```bash
touch traefik-values.yaml
```

Fill the `traefik-values.yaml` file with the following content. Replace `<your-certificate-arn>` with the certificate ARN created earlier

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

Install the Traefik with the following command:

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

### References

https://doc.traefik.io/traefik/getting-started/kubernetes/


## AWS ALB Ingress

AWS ALB has a hard limit of 100 Ingress endpoints which limits the number of Projects/Instances that can be deployed.

## Setup AWS SES for email

https://eu-west-1.console.aws.amazon.com/ses/home?region=eu-west-1#/homepage

Setup identity to match sending domain (requires DNS entries)
Setup email identity to send test emails to
Request move to production from sandbox (need to include examples of emails being sent and why/when those emails will be sent should only need this for prod)


`ses_policy.json` (with suitable aws id, aws region and domain modifications):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendTemplatedEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "arn:aws:ses:[aws region]:[aws id]:identity/[domain name]"
        }
    ]
}
```

```bash
IAM_POLICY_ARN=$(aws iam create-policy --policy-name FlowForgeSendEmail --policy-document file://ses_policy.json --output json | jq -r .Policy.Arn)
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
OIDC_PROVIDER=$(aws eks describe-cluster --name flowforge --query "cluster.identity.oidc.issuer" --output text | sed -e "s/^https:\/\///")


read -r -d '' TRUST_RELATIONSHIP <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:default:flowforge"
        }
      }
    }
  ]
}
EOF
echo "${TRUST_RELATIONSHIP}" > trust.json

aws iam create-role --role-name flowforge_service_account_role --assume-role-policy-document file://trust.json --description "Role to bind to flowforge service account"

aws iam attach-role-policy --role-name flowforge_service_account_role --policy-arn=$IAM_POLICY_ARN
```

Make a note of the  ARN for the IAM Role (flowforge_service_account_role) is needed in the helm chart values yaml file.
`aws iam get-role --role-name flowforge_service_account_role`

### References

Create a IAM Role to bind IAM Policies to the service account https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html

Create IAM Policy to allow sending emails (example: https://docs.aws.amazon.com/ses/latest/dg/sending-authorization-policy-examples.html)

## Use AWS RDS PostgreSQL instance

The following script creates a AWS RDS PostgreSQL instance, it also
sets up some network access rules so only the FlowFuse app can access
it from inside the cluster (and not the Node-RED instances).

Please read it carefully before running it to ensure you understand it.

A copy of this file can be found [here](https://github.com/FlowFuse/flowforge/blob/f8c06e3cea0ffb539350797af429f1a0366243f1/docs/install/kubernetes/setup-rds.sh)

Run the following command

```bash
./setup-rds.sh
```

Make a note of the postgres hostname
```bash
aws rds describe-db-instances | jq .DBInstances[].Endpoint.Address
```

### References

https://dev.to/bensooraj/accessing-amazon-rds-from-aws-eks-2pc3
