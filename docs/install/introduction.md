---
navTitle: Overview
navOrder: 1
meta:
   description: Install and manage FlowFuse on Linux, Windows, and MacOS. Explore deployment models, request a trial license, and find Docker and Kubernetes setup guides. Start with FlowFuse today!
   tags:
     - installation
     - flowfuse
     - docker
     - kubernetes
     - trial license
     - deployment models
templateEngineOverride: njk,md    
installationServiceHubspot:
  formId: "22edc659-d098-4767-aeb1-6480daae41ad"
  targetId: "hs-form-installation-service"
---

# Installing FlowFuse

FlowFuse can be installed to run in Docker or Kubernetes based environments.

 - **Docker:**
    - [Quick Start Guide](/docs/quick-start)
    - [Full Install](/docs/install/docker/README.md)
 - **Kubernetes:**
    - [Install Guide](/docs/install/kubernetes/README.md)

We also provide one-click installs of the Docker version:

 - [Digital Ocean Docker Install Guide](/docs/install/docker/digital-ocean.md)
 - [AWS Docker Install Guide](/docs/install/docker/aws-marketplace.md)

## Upgrading FlowFuse

If you are upgrading FlowFuse, please refer to the [Upgrade Guide](/docs/upgrade/README.md)
for any specific actions required.

## Do You Need Help? Installation Service

If you need assistance, request our complimentary Installation Service, and we will help you install FlowFuse.

{% set formId = installationServiceHubspot.formId %}
{% set targetId = installationServiceHubspot.targetId %}
{% set cta = "cta-request-installation-service" %}
{% set reference = "docs-install-intro" %}
{% include "hubspot/hs-form.njk" %}