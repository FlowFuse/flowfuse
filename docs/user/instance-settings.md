---
navTitle: Instance Settings
---

# Instance Settings

The Instance Settings allow you to customize many aspects of your Node-RED runtime.

Instance Settings are split into a number of sections:

 - [General](#general)
 - [Environment](#environment)
 - [High Availability](#high-availability)
 - [Editor](#editor)
 - [Security](#security)
 - [Palette](#palette)
 - [Alerts](#alerts)

## General

This section includes a number of actions you can take on the instance:

### Change Stack

The Stack determines the version of Node-RED being used. If a new stack
is available, you can use this option to update you stack.

### Copy Instance

This allows you to create a copy of the instance in your team. 

### Import Instance

This allows you to take existing Node-RED flow and credential files and import them
into your instance.

### Suspend Instance

This stops the instance entirely.

### Delete Instance

If you're really sure you don't want the instance any more, this allows you to delete
it. You cannot undo deleting an instance. Devices assigned to the instance will be
unassigned from the instance and available to reassign to a new instance.

## Environment

This allows you to manage the environment variables. More information
on working with environment variables is available [here](./envvar.md).

## High Availability

This allows you to manage the HA settings of the instance. High Availability
is a Preview Feature. More information is available [here](./high-availability.md).

## Editor

This covers a number of options to customize the Node-RED editor. This includes:

 - Disabling the editor entirely
 - Modifying the paths the editor and dashboard are served on
 - Choosing which code editor to use in your Node-RED nodes
 - Setting a custom title for the editor
 - Choosing a light or dark theme for the editor
 - Controlling the runtime timezone
 - Controlling the use of node modules in function nodes

## Security

This allows you to modify the security settings of the runtime. In particular
this covers the security applied to any HTTP routes served by the runtime.

The default option is not to apply any security - so any HTTP In nodes, or Node-RED
Dashboard can be accessed by anyone.

You can optionally enabled Basic Authentication, with a single hardcoded username
and password.

Alternatively with a licensed instance of FlowFuse you can require anyone accessing 
those routes to be logged into FlowFuse. The hosted pages or API endpoints are only 
available for FlowFuse users that have access to the team on FlowFuse and the cloud 
instance.

If using FlowFuse user Authentication you can also generate HTTP Bearer tokens that
can be used to access APIs hosted in Instances with HTTP-in/HTTP-response nodes.

## Palette

This allows you to manage what extra nodes are installed inside Node-RED, as well
as any restrictions you want to apply to the Palette Manager within Node-RED.

It includes the option to add extra Node-RED Catalogue URLs and a `.npmrc` file
that will be deployed to the instance. Details of the `.npmrc` format can be found
[here](https://docs.npmjs.com/cli/v9/configuring-npm/npmrc)

## Alerts

Alerts are a feature designed to provide email notifications based on specific Auditlog events. This functionality ensures prompt awareness and response to critical events.

Users have the ability to configure alerts for the following Auditlog events:
- Node-RED has crashed
- Node-RED has been placed in Safe Mode

When configuring alerts, you can choose the recipients of these notifications:
- Team Owners
- Team Members
- Both Owners and Members