---
navTitle: Installing a license
meta:
   description: Upgrade your self-managed FlowFuse installation with enterprise features by uploading a license and enabling FlowFuse Authentication for Node-RED plugins.
   tags:
     - enterprise
     - license
     - flowfuse
     - nodered
     - authentication
     - upgrade
---

## Upgrading to FlowFuse Enterprise

For self-managed FlowFuse installations without a license you can unlock more
features with a enterprise license. As an admin a license can be uploaded to
FlowFuse in the admin panel, under the settings tab. When a license is uploaded
a restart of the `forge` app is required.

After the forge application has restarted, the Node-RED runtimes need to be
updated to leverage these features. As restarting Node-RED might need to be
coordinated, FlowFuse will not automatically restart all instances.
