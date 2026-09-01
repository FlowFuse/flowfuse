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

This page lists the outbound access a self-hosted FlowFuse platform needs. It applies to
both the Docker and Kubernetes installations, and covers the FlowFuse application, the
Node-RED instances it hosts, and the browsers that open the editor.

Two related lists live elsewhere:

- Inbound access to the platform is ports `80` and `443`. See
  [Docker install](./docker/README.md#requirements) and [DNS setup](./dns-setup.md).
- The Device Agent has its own list, which includes FlowFuse Cloud endpoints. See
  [Device Agent networking requirements](../device-agent/install/overview.md#networking-requirements).

All destinations below are outbound TCP.

## Always required

| Destination | Port | Purpose |
| --- | --- | --- |
| `registry.npmjs.org` | 443 | Installing Node-RED and node packages |
| `catalogue.nodered.org` | 443 | Default node catalogue used by the editor palette |
| `registry-1.docker.io`, `auth.docker.io`, `production.cloudflare.docker.com` | 443 | Pulling FlowFuse and Node-RED container images, at install and at every upgrade |
| `ping.flowforge.com` | 443 | Anonymous usage telemetry |

Telemetry can be turned off on open source installations, but
[licensed installations cannot disable it](../admin/telemetry.md#configuring-telemetry).

## Required for specific features

Only open these if the feature is in use.

| Destination | Port | Feature | Turn off with |
| --- | --- | --- | --- |
| `registry.flowfuse.com`, `ff-certified-nodes.flowfuse.cloud` | 443 | FlowFuse Certified Nodes, from the server, the editor browsers and the hosted instances | Leave the certified nodes token unset |
| `app.flowfuse.com` | 443 | Daily import of the public blueprint library | `blueprintImport.enabled: false` |
| `expert.flowfuse.com` | 443 | FlowFuse Expert and the in-editor assistant | `ai.enabled: false` |
| `expert-broker.flowfuse.com` | 8883 | FlowFuse Expert MQTT broker, a Helm chart default | `ai.enabled: false` |
| `api.github.com`, `github.com` | 443 | GitOps pipelines | Do not configure a GitOps integration |
| `www.googleapis.com` | 443 | Google SSO | Do not configure Google SSO |
| `acme-v02.api.letsencrypt.org` | 443 | Automatic TLS certificates | Use a certificate you supply yourself |
| Your SMTP relay | 587 or 465 | Invitations, password resets and notifications | Leave `email` unconfigured |

## Restricted networks

A hostname allowlist covers the large majority of Node-RED nodes, but not all of them. Some
packages download native builds at install time from arbitrary hosts, such as GitHub releases
or S3 buckets. Those cannot be listed up front.

If that is not acceptable, host the packages yourself and point FlowFuse at them:

- An internal npm registry and your own node catalogue. See
  [3rd party npm registries](../user/custom-npm-packages.md#npm-registries).
- A mirror of the FlowFuse and Node-RED container images in your own registry.

On Kubernetes, also see
[Network Policies](./kubernetes/README.md#i-use-kubernetes-network-policies%2C-how-can-i-configure-them%3F).
