---
navOrder: 1
navTitle: Introduction
---

# Migrating a Node-RED application to FlowFuse 

This guide will help you to move an existing set of flows from Node-RED into 
one managed by the FlowFuse platform.

When migrating from your Node-RED to a FlowFuse managed instance you'll export
the flows, credentials, and environment variables.

Before you start ensure you can log in to FlowFuse Cloud or your own FlowFuse
server and have created the target Node-RED instance.

## Migrating the flows and credentials

Install the Node-RED tools plugin as explained
[in the documentation](/docs/migration/node-red-tools.md). After you created a snapshot for
the target instance you'll have copied over the flows and credentials.

## Migrating Environment Variables

You can use [this flow](https://flows.nodered.org/flow/8ebfe9ae218aa5105e7da13db14ac272)
to dump a list of your environment variables into the debug window. For each
variable needed for the flow should be added on FlowFuse under 
Instance > Settings > Environment tabs.

## Starting the snapshot

Under the snapshots tab, click 'Rollback' in the kebab menu. The migrated flows
will now be started with the modules installed.

## Limitations

### Static Files

Check your `settings.js` file to see if `httpStatic` has been set, if so then
check for any files in this path. FlowFuse does not currently support serving
static files so you will need to find alternative hosting for these such as AWS S3.
