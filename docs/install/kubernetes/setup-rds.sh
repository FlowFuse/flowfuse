#!/bin/bash -x

# https://dev.to/bensooraj/accessing-amazon-rds-from-aws-eks-2pc3

RDS_VPC_ID=$(aws ec2 create-vpc --tag-specifications ResourceType=vpc,Tags='[{Key=Name,Value="flowforge-db-vpc"}]' --cidr-block 10.0.0.0/24 | jq -r '.Vpc.VpcId')

echo $RDS_VPC_ID

AZ_A=$(aws ec2 create-subnet --availability-zone "eu-west-1a" --vpc-id ${RDS_VPC_ID} --cidr-block 10.0.0.0/26 --tag-specifications ResourceType=subnet,Tags='[{Key=Name,Value="ff-db-subnet-eu-west-1a"}]' | jq -r '.Subnet.SubnetId')

AZ_B=$(aws ec2 create-subnet --availability-zone "eu-west-1b" --vpc-id ${RDS_VPC_ID} --cidr-block 10.0.0.64/26 --tag-specifications ResourceType=subnet,Tags='[{Key=Name,Value="ff-db-subnet-eu-west-1b"}]' | jq -r '.Subnet.SubnetId')

AZ_C=$(aws ec2 create-subnet --availability-zone "eu-west-1c" --vpc-id ${RDS_VPC_ID} --cidr-block 10.0.0.128/26 --tag-specifications ResourceType=subnet,Tags='[{Key=Name,Value="ff-db-subnet-eu-west-1c"}]' | jq -r '.Subnet.SubnetId')

echo $AZ_A
echo $AZ_B
echo $AZ_C

ROUTE_TABLE_ID=$(aws ec2 describe-route-tables --filters Name=vpc-id,Values=${RDS_VPC_ID} | jq -r '.RouteTables[0].RouteTableId')

echo $ROUTE_TABLE_ID

aws ec2 associate-route-table --route-table-id $ROUTE_TABLE_ID --subnet-id $AZ_A

aws ec2 associate-route-table --route-table-id $ROUTE_TABLE_ID --subnet-id $AZ_B

aws ec2 associate-route-table --route-table-id $ROUTE_TABLE_ID --subnet-id $AZ_C

aws rds create-db-subnet-group --db-subnet-group-name  "FlowForgeDBSubnetGroup" --db-subnet-group-description "FlowForge DB Subnet Group" --subnet-ids "$AZ_A" "$AZ_B" "$AZ_C" | jq '{DBSubnetGroupName:.DBSubnetGroup.DBSubnetGroupName,VpcId:.DBSubnetGroup.VpcId,Subnets:.DBSubnetGroup.Subnets[].SubnetIdentifier}'

RDS_VPC_SECURITY_GROUPID=$(aws ec2 create-security-group --group-name FlowForgeRDSSecurityGroup --description "FlowForge RDS security group" --vpc-id ${RDS_VPC_ID} --tag-specifications ResourceType=security-group,Tags='[{Key=Name,Value="ff-db-security-goup"}]' | jq -r '.GroupId')

aws rds create-db-instance --db-name "flowforge" \
	--db-instance-identifier flowforge-postgres-instance \
	--db-instance-class db.t4g.small \
	--allocated-storage 10 \
	--engine postgres \
	--storage-encrypted \
	--engine-version "14.1" \
	--master-username "postgres" \
	--master-user-password "Moomiet0" \
	--no-publicly-accessible \
	--vpc-security-group-ids $RDS_VPC_SECURITY_GROUPID\
	--db-subnet-group-name FlowForgeDBSubnetGroup \
	--port 5432

sleep 15

K8S_VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:eksctl.cluster.k8s.io/v1alpha1/cluster-name,Values=flowforge-test" | jq -r '.Vpcs[].VpcId')

echo $K8S_VPC_ID

PEERING_REQ_ID=$(aws ec2 create-vpc-peering-connection \
	--tag-specification ResourceType=vpc-peering-connection,Tags='[{Key=Name,Value="flowforge-rds-to-eks"}]' \
	--vpc-id $RDS_VPC_ID \
	--peer-vpc-id $K8S_VPC_ID | jq -r '.VpcPeeringConnection.VpcPeeringConnectionId')

echo $PEERING_REQ_ID

aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id $PEERING_REQ_ID


EKS_ROUTE_TABLE_ID=$(aws ec2 describe-route-tables --filters Name="tag:aws:cloudformation:logical-id",Values="PublicRouteTable" | jq -r '.RouteTables[0].RouteTableId')

aws ec2 create-route --route-table-id ${EKS_ROUTE_TABLE_ID} --destination-cidr-block 10.0.0.0/24 --vpc-peering-connection-id ${PEERING_REQ_ID}

aws ec2 create-route --route-table-id ${ROUTE_TABLE_ID} --destination-cidr-block 192.168.0.0/16 --vpc-peering-connection-id ${PEERING_REQ_ID}

aws ec2 authorize-security-group-ingress --group-id ${RDS_VPC_SECURITY_GROUPID} --protocol tcp --port 5432 --cidr 192.168.0.0/16


