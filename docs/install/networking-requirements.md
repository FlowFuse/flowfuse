---
navTitle: Networking requirements
meta:
   description: The outbound network access a self-hosted FlowFuse platform requires, listed by hostname, port and purpose, so a firewall change can be requested in one go.
   tags:
      - installation
      - networking
      - firewall
      - proxy
      - self-hosted
      - flowfuse
---

# Networking requirements

This page lists the outbound access a self-hosted FlowFuse installation needs. It applies to
both the Docker and Kubernetes installations.

The access is not all needed from the same place. Each table names who has to reach the
destination:

- **Platform** is the host, or cluster, running the FlowFuse application.
- **Instances** are the hosted Node-RED instances and the remote instances running the Device Agent.
- **Editor browsers** are the machines people open the Node-RED editor on.

Two related lists live elsewhere:

- Inbound access to the platform is ports `80` and `443`. See
  [Docker install](./docker/README.md#requirements) and [DNS setup](./dns-setup.md).
- The Device Agent has its own list, which includes FlowFuse Cloud endpoints. See
  [Device Agent networking requirements](../device-agent/install/overview.md#networking-requirements).

All destinations below are outbound TCP.

## Always required

| Destination | Port | Needed by | Purpose |
| --- | --- | --- | --- |
| `registry.npmjs.org` | 443 | Instances | Installing Node-RED and node packages |
| `catalogue.nodered.org` | 443 | Editor browsers | The node catalogue listed in the editor palette. The editor fetches it directly, the platform does not |
| `registry-1.docker.io`, `auth.docker.io`, `production.cloudflare.docker.com` | 443 | Platform | Pulling the FlowFuse and Node-RED container images, at install and at every upgrade. Not needed if you pull the images from an internal registry or a pull-through proxy instead |

## Required for specific features

| Destination | Port | Needed by | Required when |
| --- | --- | --- | --- |
| `registry.flowfuse.com`, `ff-certified-nodes.flowfuse.cloud` | 443 | Editor browsers and instances | FlowFuse Certified Nodes are in use, which needs a certified nodes token set on the platform |
| `app.flowfuse.com` | 443 | Platform | The public blueprint library is imported daily, which is the default on a licensed install (`blueprintImport.enabled`) |
| `expert.flowfuse.com` | 443 | Platform | FlowFuse Expert or the in-editor assistant is enabled (`ai.enabled`). Both are proxied by the platform, so instances and browsers do not need this |
| `expert-broker.flowfuse.com` | 8883 | Platform | FlowFuse Expert is enabled on Kubernetes, where the Helm chart sets this broker as the default. On Docker there is no default, the broker has to be set explicitly |
| `github.com`, `api.github.com` | 443 | Platform | A GitOps pipeline pushes to GitHub |
| `dev.azure.com` | 443 | Platform | A GitOps pipeline pushes to Azure DevOps |
| Your own Git server | 443 | Platform | A GitOps pipeline pushes to any other HTTPS Git server, for example GitLab, Bitbucket, Gitea or a self-hosted one |
| `www.googleapis.com` | 443 | Platform | Google SSO is configured |
| `acme-v02.api.letsencrypt.org` | 443 | Platform | Certificates are issued automatically, rather than supplied by you |
| Your SMTP relay | 587 or 465 | Platform | Email is configured, for invitations, password resets and notifications |
| `ping.flowfuse.com` | 443 | Platform | Anonymous usage telemetry is enabled, which is the default and [cannot be disabled on a licensed installation](../admin/telemetry.md#configuring-telemetry) |

Blocking telemetry does not stop the platform. The post runs as a background task, once a
day and once shortly after startup, and a failure is written to the platform log and left
until the next run.

## Restricted networks

A hostname allowlist covers most Node-RED nodes, but not all of them. A minority of packages
download native components while installing, from hosts such as GitHub releases or S3 buckets,
which cannot be listed in advance. In practice you find out which packages do this when an
install fails.

There is no small workaround for those packages. The options are an intercepting proxy, or
building the packages and their components and hosting them yourself. Both are a significant
piece of work. Plan for a small number of nodes being unavailable rather than for full coverage.

If installs have to come from inside your own network, point FlowFuse at your own services:

- An internal npm registry and your own node catalogue. See
  [3rd party npm registries](../user/custom-npm-packages.md#npm-registries).
- An internal container registry, or a pull-through proxy, for the FlowFuse and Node-RED images.

On Kubernetes, also see
[Network Policies](./kubernetes/README.md#i-use-kubernetes-network-policies%2C-how-can-i-configure-them%3F).
