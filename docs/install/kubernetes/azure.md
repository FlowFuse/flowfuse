---
navTitle: Azure AKS Installation
meta:
   description: Learn how to install FlowFuse on AWS EKS with setup details for EKS, Nginx Ingress, AWS SES, and RDS PostgreSQL integration.
   tags:
      - flowfuse
      - nodered
      - azure
      - aks
      - nginx ingress
      - helm
      - kubernetes
---

# Azure AKS Specific details

This document includes details for installing FlowFuse on Azure AKS

## Nginx Ingress

We recommend using the <a href="https://kubernetes.github.io/ingress-nginx/" target="_blank">Nginx Ingress controller</a> as this is the one we with. 


## Persistent Storage

If making use of the Persistent Storage feature you will need to provide a StorageClass that support MultiPod mounting.

e.g. Azure Disks backed Persistent Volumes


You should also set the `nobrl` Mount Option to ensure things like SQLite databases work correctly if using the Azure Files back Persistent Volumes.

## User Azure Database for PostgreSQL

By default the helm chart will install a local copy of PostgreSQL 14.

But you may make use of Azure's hosted PostgreSQL solution, but you will need to provision the user and empty database before doing the Helm install.