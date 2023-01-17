# Project Settings

The Project Settings allow you to customize many aspects of your Node-RED runtime.

Project Settings are split into a number of sections:

 - [Environment](#environment)
 - [Editor](#editor)
 - [Security](#security)
 - [Palette](#palette)
 - [Danger](#danger)

## Environment

This allows you to manage the project's environment variables. More information
on working with environment variables is available [here](./envvar).

## Editor

This covers a number of options to customize the Node-RED editor. This includes:

 - Disabling the editor entirely
 - Modifying the paths the editor and dashboard are served on
 - Controlling the runtime timezone

## Security

This allows you to modify the security settings of the runtime. In particular
this covers the security applied to any HTTP routes served by the runtime.

The default option is not to apply any security - so any HTTP In nodes, or Node-RED
Dashboard can be accessed by anyone.

You can optionally enabled Basic Authentication, with a single hardcoded username
and password.

Alternatively you can require anyone accessing those routes to be logged into
FlowForge.

## Palette

This allows you to manage what extra nodes are installed inside Node-RED, as well
as any restrictions you want to apply to the Palette Manager within Node-RED.

## Danger

This section includes a number of actions you can take on the project:

### Change Stack

The Project Stack determines the version of Node-RED being used. If a new stack
is available, you can use this option to updated your project.

### Copy Project

This allows you to create a copy of the project in your team. Alternatively, you
can use it to export certain parts of your project into an existing project.

For example, you may want to have separate 'Development' and 'Production' projects
using different Environment Variables to point the flows at different external
resources. You can then use the 'Export into existing project' to copy over just the
flows when you want to update your Production instance.

### Import Project

This allows you to take existing Node-RED flow and credential files and import them
into your project.

### Suspend Project

This stops the project entirely.

### Delete Project

If you're really sure you don't want the project anymore, this allows you to delete
it. You cannot undo deleting a project.
