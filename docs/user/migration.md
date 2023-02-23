# Migrating a Node-RED project to FlowForge 

This guide will help you to move your project from a generic Node-RED host onto
FlowForge. When migrating from your Node-RED to a FlowForge managed instance
you'll export the flows, credentials, and environment variables.

Before you start ensure you can login to FlowForge Cloud or your own FlowForge
server and have created the target project.

## Migrating the flows and credentials

Install the Node-RED tools plugin as explained
[in the documentation](./node-red-tools.md). After you created a snapshot for
the target project you'll have copied over the flows and credentials.

## Migrating Environment Variables

You can use [this flow](https://flows.nodered.org/flow/8ebfe9ae218aa5105e7da13db14ac272)
to dump a list of your environment variables into the debug window. For each
variable needed for the flow should be added on FlowForge under 
Project > Settings > Environment tabs.

## Starting the snapshot

Under the snapshots tab, click 'Rollback' in the kebab menu. The migrated flows
will now be started with the modules installed.

## Limitations

### Static Files

Check your `settings.js` file to see if `httpStatic` has been set, if so then
check for any files in this path. FlowForge does not currently support serving
static files so you will need to find alternative hosting for these such as AWS S3.
