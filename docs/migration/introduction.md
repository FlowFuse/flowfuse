---
navOrder: 1
navTitle: Introduction
meta:
   description: Guide to migrating Node-RED applications to FlowFuse, covering flows, credentials, environment variables, and handling static files.
   tags:
     - migration
     - nodered
     - flowfuse
     - snapshot
     - environment variables
---

# Migrating a Node-RED application to FlowFuse 

This guide will help you to move existing Node-RED instances into 
FlowFuse.

When migrating your Node-RED instances into FlowFuse, you'll export
the flows, credentials, and environment variables.

Before you start ensure you can log in to FlowFuse Cloud or your own FlowFuse
server, and that you have created your Node-RED instance that you wish to move into FlowFuse. 

If you have not yet created a Node-RED instance that you want to manage within FlowFuse, you can create the new instance within FlowFuse directly, and the following instructions will not apply in your case.

## Migrating the flows and credentials

Install the Node-RED tools plugin as explained
[in the documentation](/docs/migration/node-red-tools.md). After you created a snapshot for
the Node-RED instance you wish to move, you'll have copied over the flows and credentials.

## Migrating Environment Variables

You can use [this flow](https://flows.nodered.org/flow/8ebfe9ae218aa5105e7da13db14ac272)
to dump a list of your environment variables into the debug window. For each
variable needed for the flow should be added on FlowFuse under 
Instance > Settings > Environment tabs.

## Starting the snapshot

Under the snapshots tab, click 'Restore Snapshot' in the kebab menu. The migrated flows
will now be started with the modules installed.

## Limitations

### Static Files

Check your `settings.js` file to see if `httpStatic` has been set, if so then
check for any files in this path. The files in this path need to be manually
migrated to [FlowFuse's Static Assets](/docs/user/static-asset-service/) service.
