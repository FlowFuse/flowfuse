---
navTitle: Upgrading the Node-RED version
meta:
   description: Upgrade the Node-RED version your self-hosted FlowFuse Instances run by creating a new Stack, using the move to Node-RED 5.0 as a worked example.
   tags:
     - nodered
     - stack
     - upgrade
     - flowfuse
     - self-hosted
---

# Upgrading the Node-RED version

A new major version of Node-RED - such as Node-RED 5.0 - does **not** arrive
through an in-editor or in-platform "update" button. The version of Node-RED an
Instance runs is defined by its [Stack](../user/concepts.md#stack). To move to a
new major version you add it as a new Stack, then point your Instances at it.

This page uses the move to **Node-RED 5.0** as a worked example, but the same
steps apply to any major Node-RED version upgrade.

## Why there's no update button

The notification and one-click upgrade you may have seen applies to new *versions
of an existing Stack* (see [Managing Stacks](../admin/introduction.md#managing-stacks)).
Crossing a major Node-RED version is different: you create a new Stack that pins
the new container, rather than upgrading the existing Stack in place. This keeps
the two versions side by side so you can move Instances over at your own pace.

## Before you start

- You will need access to **Admin Settings**.
- Add the new Node-RED version as a **distinct new Stack** rather than editing your
  existing Stack. Keeping them separate means your current Instances stay on their
  existing version until you choose to move them, and you can switch back from an
  Instance's settings if needed.

## Create the new Stack

1. Go to **Admin Settings → Stacks**.
2. Click **Create Stack**.
3. Set the **Container Location** to the image for the new Node-RED version. The
   exact value depends on your deployment model - see the deployment-specific
   guides below. For Node-RED 5.0 on Docker or Kubernetes this is
   `flowfuse/node-red:2.31.2-5.0.x`; the full list of pre-built tags is on
   [Docker Hub](https://hub.docker.com/r/flowfuse/node-red/tags).
4. Save the Stack. It is now available when you create or migrate Instances.

For the details of how the Container Location is specified for each deployment
model, see:

- [Local Stacks](../contribute/local/stacks.md)
- [Docker Stacks](../install/docker/stacks.md)
- [Kubernetes Stacks](../install/kubernetes/stacks.md)

## Use the new Stack

### For a new Instance

Select the new Stack when you create the Instance. It starts on the new Node-RED
version right away.

### For an existing Instance

Move the Instance onto the new Stack by following
[Changing the Stack](../user/changestack.md): open the Instance's **Settings**
tab and use **Change Instance Stack** to select the new Stack. The Instance
restarts on the new Stack.

## Good to know

- You can switch an Instance back to its previous Stack from the same Settings
  page, as long as the old Stack still exists.
- Test the new version on a single Instance before moving production workloads
  across.

Questions? [Reach out to FlowFuse support](https://flowfuse.com/support/) - we're
happy to help.
