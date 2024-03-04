---
navTitle: AWS EKS Installation
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

### Nginx Ingress

It is recommended to run the Nginx Ingress controller even on AWS EKS (The AWS ALB load balancer currently appears to only support up to 100 Ingress Targets which limits the number of Instance/Projects that can be run).

Create a `nginx-values.yaml` file to pass the values to the nginx helm file.

You will need to replace the ARN for the SSL certificate created earlier

```yaml
controller:
  # publishService required to Allow ELB Alias for DNS registration w/ external-dns
  publishService:
    enabled: true
  tcp:
    configNameSpace: $(POD_NAMESPACE)/tcp-services
  udp:
    configNameSpace: $(POD_NAMESPACE)/udp-services
  config:
    proxy-body-size: "0"
  service:
    # AWS Annotations for LoadBalaner with Certificate ARN
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:us-west-2:XXXXXXXXXXXX:certificate/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
      service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
      service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
      service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout: "120"
    # TLS (https) terminated at ELB, so internal endpoint is 'http'
    targetPorts:
      https: http

```

The `proxy-body-size: "0"` removes the `1m` nginx default limit, you can set this to a 
different vale e.g. "5m" which will match the Node-RED default.

Add the ingress-nginx helm repo

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
```

Then install with

```bash
helm install \
  ingress-nginx \
  --values nginx-values.yaml \
  ingress-nginx/ingress-nginx
```

You will also want to mark the new ingressclass as the default so it is picked up by default without the need for special annotations.

```bash
kubectl annotate ingressclass nginx ingressclass.kubernetes.io/is-default-class=true
```

### References

https://joachim8675309.medium.com/adding-ingress-with-amazon-eks-6c4379803b2


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
