# Configuring FlowForge

The base configuration of the FlowForge platform is provided in the file
`/opt/flowforge/etc/flowforge.yml`. This assumes the default install location
of `/opt/flowforge`.

To run a local install, you can use the default options. This section describes
the options available in the configuration file.

## Server configuration

Option | Description
-------|------------
`host` | The address to serve the web ui on. This defaults to `localhost` which means the ui will only be available when browsing from the same server that is running the platform. To make it accessible to other devices on the network, set it to `0.0.0.0`. <br>NOTE: If `host` is changed, please also update `base_url` to match e.g.  `http://[ip-address-of-host]:3000`<br>NOTE: We do not support changing the host value once you have created a project.
`port` | The TCP port the platform serves its web ui. Default: `3000`
`base_url` | The url to access the platform. This defaults to `http://localhost:3000` which means a number of internally generated URLs will only work when browsing on the same device as is running the platform. To be able to access the platform remotely, replace `localhost` with the ip address of the device running FlowForge. IMPORTANT: This should not be changed after starting projects as it is used by the projects to find the core platform.
`support_contact` | a URL or string with contact details for the administrator e.g `mailto:support@example.com` or `https://support.example.com` . Defaults to the email address of the first admin user or `the administrator` if no email address set.

## Database configuration

FlowForge supports `sqlite` and `postgres` databases.

Option       | Description
-------------|------------
`db.type`    | The type of database to use. Default: `sqlite`.

### SQLite configuration

Option       | Description
-------------|------------
`db.storage` | Path to the SQLite Database file to use, relative to `/opt/flowforge/var/`. Default: `forge.db`.

### Postgres configuration

Option       | Description
-------------|------------
`db.host`    | Hostname of the Postgres Database. Default: `postgres`.
`db.database`| Database name on Postgres Server. Default: `flowforge`.
`db.user`    | Username used when connecting to Postgres Server. 
`db.password`| Password used when connecting to Postgres Server.

## Project Driver configuration

This configures how Node-RED instances are run by the platform.

Option        | Description
--------------|------------
`driver.type` | The type of deployment model to use. Default: `localfs`

### Localfs Driver options

Option        | Description
--------------|------------
`driver.options.start_port` | The port number to start assigning to projects as they are created. Default: `12080`
`driver.options.node_path` | The path to find the node.js executable - useful if Node.js has been installed with `nvm` so isn't necessarily on the system path.

### Docker Driver options

Option        | Description
--------------|------------
`driver.options.socket` | The path to the Docker control unix domain socket. Default `/var/run/docker.sock`

### Kubernetes Driver options

Option        | Description
--------------|------------
`driver.options.namespace` | The namespace to run projects in. Default: `flowforge`
`driver.options.cloudProvider` | Enables specific options for certain platforms e.g. `aws`. Default: not set
`driver.options.projectSelector` | A YAML object containing node annotations to use to filter which nodes projects run on. Default: `role: projects`

## MQTT Broker configuration

By default, the platform runs without an MQTT broker. This restricts some features
in the platform, such as the Project Nodes.

If a broker has been setup in the platform, the following configuration is required:

Option        | Description
--------------|------------
`broker.url`  | The url for the platform to access the broker. For example: `mqtt://localhost:4800`.
`broker.public_url` | The url used by devices to connect to the broker, if different to `broker.url`. For example, this may require devices to use WebSockets instead: `ws://localhost:4881`.

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

See [here](./email_providers.md) for example configuration with common email providers.

## Telemetry configuration

By default, the platform will send anonymous usage information back to us at FlowForge Inc.
This can be disabled via the Admin Settings in the UI, or turned off in the configuration file with the `telemetry.enabled` option.

Additionally, you can configure your own instance of FlowForge to report back to you on how users are using your instance of FlowForge. FlowForge supports integration with two different services:

- [PostHog](https://posthog.com/) _(recommended)_: You will require your own API key to pass into the `yml`, which will begin the logging of user interactions.
- [Plausible](https://plausible.io/): _(deprecated since 0.9 and will be removed in the future)_: You can setup your own account, and pass the relevant domain to the `yml` in the telemetry configuration

For more information about this feature, see [here](/docs/admin/telemetry.md)

Option        | Description
--------------|------------
`telemetry.enabled` | Enables the anonymous usage telemetry of the platform. Default: `true`
`telemetry.frontend.posthog.apikey` | The API key provided to you from your own PostHog account. Default: `null`
`telemetry.frontend.posthog.capture_pageview` | FlowForge is designed as to provide custom posthog `$pageview` events that provide more detail on navigation than the default, and suit a single page application better. As such, we recommend setting this to false in order to prevent duplicate `pageleave`/`pageview` events firing. Default: `true`


## MQTT Broker configuration

The platform depends on the [Mosquitto MQTT Broker](https://mosquitto.org/) to
provide real-time messaging between devices and the platform.

This is currently an *optional* component - the platform will work without the
broker, but some features will not be available.

Option         | Description
---------------|--------------
`broker.url`   | The full url to the platform broker. This is used by the platform and project launchers to connect to the broker. For example: `mqtt://localhost:1883`.
`broker.public_url` | If set, this is the url provided to Devices to connect to the broker with. When running in a Docker or K8S environment, this url should be the externally addressable url the broker is provided on. This could be via WebSockets, for example: `ws://example.com:1884`

## Logging configuration

By default the forge app is set to `info` level logging, with the HTTP routes logged at `warn`

Option        | Description
--------------|------------
`logging.level` | Change the default logging level. Default: `info`
`logging.http`  | Change the default HTTP route logging level. Default: `warn`

Setting `logging.http` to `info` will log every HTTP request and response details.

## File storage

FlowForge can provide an Object Store to allow users to read or write a
file from flows.

Option        | Description
--------------|------------
`fileStore.url`  | The URL of the FlowForge File Server to use. Default: not set