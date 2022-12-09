# AWS EKS Specific details

This document includes details of installing FlowForge on AWS EKS

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

## Create AWS Container Repositories

https://eu-west-1.console.aws.amazon.com/ecr/repositories

(URL above assumes setting up in eu-west-1, change this to the region you intent to run)

To start with we need the following 2 repositories (more later when we have more templates)

- `flowforge/forge-k8s`
- `flowforge/node-red`

Record the host name it will look like `[aws id].dkr.ecr.[aws region].amazonaws.com`

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
  name: flowforge
  region: us-east-1

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
        efs: true
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

Add oidc provider for Loadbalance and IAM roles
```bash
eksctl utils associate-iam-oidc-provider --cluster flowforge-test --approve
```

Add AWS Load balancer (remember to update `[aws id]`)
```bash
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.2.0/docs/install/iam_policy.json

aws iam create-policy --policy-name AWSLoadBalancerControllerIAMPolicy --policy-document file://iam_policy.json
eksctl create iamserviceaccount --cluster=flowforge-test --namespace=kube-system --name=aws-load-balancer-controller --attach-policy-arn=arn:aws:iam::[aws id]:policy/AWSLoadBalancerControllerIAMPolicy --override-existing-serviceaccounts --approve

helm repo add eks https://aws.github.io/eks-charts
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

K8S_VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:eksctl.cluster.k8s.io/v1alpha1/cluster-name,Values=flowforge-test" | jq -r '.Vpcs[].VpcId')
helm install aws-load-balancer-controller eks/aws-load-balancer-controller --set clusterName=flowforge-test --set serviceAccount.create=false --set region=eu-west-1 --set vpcId=$K8S_VPC_ID --set serviceAccount.name=aws-load-balancer-controller -n kube-system
```

### References

https://aws.amazon.com/premiumsupport/knowledge-center/eks-alb-ingress-controller-fargate/

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
IAM_POLICY_ARN=$(aws iam create-policy --policy-name FlowForgeSendEmail --policy-document file://ses_policy.json | jq -r .Policy.Arn)
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
sets up some network access rules so only the FlowForge app can access
it from inside the cluster (and not the Node-RED Projects).

Please read it carfully before running it to ensure you understand it.

A copy of this file can be found [here](setup-rds.sh)

Run the following command

```bash
./setup-rds.sh
```

Make a note of the postgress hostname
```bash
aws rds describe-db-instances | jq .DBInstances[].Endpoint.Address
```

### References

https://dev.to/bensooraj/accessing-amazon-rds-from-aws-eks-2pc3