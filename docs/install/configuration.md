# Configuring FlowForge

The base configuration of the FlowForge platform is provided in the file `/opt/flowforge/etc/flowforge.yml` [^1].

To run a local install, you can use the default options. This section describes
the options available in the configuration file.


[^1]: This assumes the default install location of `/opt/flowforge`.

## Server configuration

Option | Description
-------|------------
`port` | The TCP port the platform serves its web ui. Default: `3000`
`base_url` | The url to access the platform. This defaults to `localhost` which means a number of internally generated URLs will only work when browsing on the same device as is running the platform. To be able to access the platform remotely, replace `localhost` with the ip address of the device running FlowForge.


## Database configuration

FlowForge supports `sqlite` and `postgres` databases.


Option       | Description
-------------|------------
`db.type`    | The type of database to use. Default: `sqlite`.
`db.storage` | Path to the SQLite Database file to use, relative to `/opt/flowforge/var/`. Default: `forge.db`.

## Project Driver configuration

This configures how Node-RED instances are run by the platform.

Option        | Description
--------------|------------
`driver.type` | The type of deployment model to use. Default: `localfs`
`driver.options.start_port` | The port number to start assigning to projects as they are created. Default: `7880`
`driver.options.node_path` | The path to find the node.js executable - useful if Node.js has been installed with `nvm` so isn't necessarily on the system path.


## Email configuration

By default, email is disabled. This restricts some features in the platform around
inviting new users to join.

Option        | Description
--------------|------------
`email.enabled` | Enables the email sending functionality of the platform. Default: `false`
`email.smtp.host` | Hostname of the SMTP server to send email through. Default: `localhost`
`email.smtp.port` | Port of the SMTP server to send email through. Default: `587` if `secure` is `false`, `465` otherwise
`email.smtp.secure` | Whether to use TLS to connect to the SMTP server. Default: `false`
`email.smtp.auth.user` | Username to authenticate the connection with. Default: `unset`
`email.smtp.auth.pass` | Password to authenticate the connection with. Default: `unset`
`email.debug`   | If set to true, it will log the full content of emails it tries to send. Default: `false`

See [here](./email_providers.md) For example config for common email providers
