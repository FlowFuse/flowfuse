---
navTitle: Configuring FlowFuse
---

# Configuring FlowFuse

The base configuration of the FlowFuse platform is provided in the file
`/opt/flowforge/etc/flowforge.yml`. This assumes the default install location
of `/opt/flowforge`.

To run a local install, you can use the default options. This section describes
the options available in the configuration file.

## Server configuration

Option | Description
-------|------------
`host` | The address to serve the web ui on. This defaults to `localhost` which means the ui will only be available when browsing from the same server that is running the platform. To make it accessible to other devices on the network, set it to `0.0.0.0`. <br>NOTE: If `host` is changed, please also update `base_url` to match e.g.  `http://[ip-address-of-host]:3000`
`port` | The TCP port the platform serves its web ui. Default: `3000`
`base_url` | The url to access the platform. This defaults to `http://localhost:3000` which means a number of internally generated URLs will only work when browsing on the same device as is running the platform. To be able to access the platform remotely, replace `localhost` with the ip address of the device running FlowFuse. 
`domain` | The domain that instance names will be prepended to on Docker & Kubernetes platforms to create a hostname to access the instance. A wildcard DNS A record should point be configured to point to the FlowFuse entry IP Address.
`support_contact` | a URL or string with contact details for the administrator e.g `mailto:support@example.com` or `https://support.example.com` . Defaults to the email address of the first admin user or `the administrator` if no email address set.
`create_admin` | If set to `true` will create a default admin user on first run, the username/password is written to the logs. Default: `false`
`create_admin_access_token` | If set to `true` an access token (ffpat) is created for the default admin user on first run. Its value is written to the logs. Default: `false`


NOTE: Changing the `base_url` and `domain` after Node-RED instances have been created is possible, but the original hostname and domain must remain active in order to access the instances and for an them to be able to access the FlowFuse resources.

An example workflow would be:

1. Register new domain
2. Set up DNS entries for:
    - A record for the forge app
    - wildcard A record for the domain
3. Leave the existing entries for the old domain in place
4. Stop the forge app
5. Edit the flowforge.yml to set the base_url and domain entries
6. Restart the forge app

## Database configuration

FlowFuse supports `sqlite` and `postgres` databases.

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
`db.ssl`     | Client should connect with SSL/TLS. Default: `false`

## Node-RED Driver configuration

This configures how Node-RED instances are run by the platform.

Option        | Description
--------------|------------
`driver.type` | The type of deployment model to use. Default: `localfs`

### Localfs Driver options

Option        | Description
--------------|------------
`driver.options.start_port` | The port number to start assigning to Node-RED instances as they are created. Default: `12080`
`driver.options.node_path` | The path to find the node.js executable - useful if Node.js has been installed with `nvm` so isn't necessarily on the system path.

### Docker Driver options

Option        | Description
--------------|------------
`driver.options.socket` | The path to the Docker control unix domain socket. Default `/var/run/docker.sock`

### Kubernetes Driver options

Option        | Description
--------------|------------
`driver.options.namespace` | The namespace to run Node-RED instances in. Default: `flowforge`
`driver.options.cloudProvider` | Enables specific options for certain platforms e.g. `aws`. Default: not set
`driver.options.projectSelector` | A YAML object containing node annotations to use to filter which nodes Node-RED instances run on. Default: `role: projects`

## MQTT Broker configuration

By default, the platform runs without an MQTT broker. This restricts some features
in the platform, such as the Project Nodes and Remote Device Editing.

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
`email.from` | Sets the address email will appear from. Default: `"FlowFuse" <donotreply@flowforge.com>`
`email.smtp.host` | Hostname of the SMTP server to send email through. Default: `localhost`
`email.smtp.port` | Port of the SMTP server to send email through. Default: `587` if `secure` is `false`, `465` otherwise
`email.smtp.secure` | Whether to use TLS to connect to the SMTP server. Default: `false`
`email.smtp.auth.user` | Username to authenticate the connection with. Default: `unset`
`email.smtp.auth.pass` | Password to authenticate the connection with. Default: `unset`
`email.debug`   | If set to true, it will log the full content of emails it tries to send. Default: `false`

See [here](./email_providers.md) for example configuration with common email providers.

### AWS SES Email

There is also support for using AWS SES email, this is mainly intended to be used when deployed on AWS EKS.

This assumes that the instance is running with a Service Account that has a AWS Role with SES access enabled.

Option        | Description
--------------|------------
`email.ses.region` | The AWS region to connect to


## Telemetry configuration

By default, the platform will send anonymous usage information back to us at FlowForge Inc.
This can be disabled via the Admin Settings in the UI, or turned off in the configuration file with the `telemetry.enabled` option.
**IMPORTANT: Licensed installations cannot disable telemetry**

Additionally, you can configure your own instance of FlowFuse to report back to you on how users are using your instance of FlowFuse. FlowFuse supports integration with two different services:

- [PostHog](https://posthog.com/) _(recommended)_: You will require your own API key to pass into the `yml`, which will begin the logging of user interactions.
- [Plausible](https://plausible.io/): _(deprecated since 0.9 and will be removed in the future)_: You can setup your own account, and pass the relevant domain to the `yml` in the telemetry configuration

For more information about this feature, see [here](/docs/admin/telemetry.md)

Option        | Description
--------------|------------
`telemetry.enabled` | Enables the anonymous usage telemetry of the platform. Default: `true`
`telemetry.frontend.posthog.apiurl` | The API URL for PostHog, either 'https://app.posthog.com' or 'https://eu.posthog.com'. Default: `https://app.posthog.com`
`telemetry.frontend.posthog.apikey` | The API key provided to you from your own PostHog account. Default: `null`
`telemetry.frontend.posthog.capture_pageview` | FlowFuse is designed as to provide custom posthog `$pageview` events that provide more detail on navigation than the default, and suit a single page application better. As such, we recommend setting this to false in order to prevent duplicate `pageleave`/`pageview` events firing. Default: `true`


## Rate Limiting configuration

By default, rate limiting is disabled and the platform will not rate limit any requests.

To enable rate limiting, you can set the `rate_limits.enabled` option to `true`. 

When enabled, all routes will be limited to 1000 requests per 1 minute window. These defaults can be adjusted by setting values in the configuration options listed below.

Option        | Description
--------------|------------
`rate_limits.enabled` | Enables rate limiting. Default: `false`
`rate_limits.global` | Enables rate limiting for all routes. Default: `true` (defaults to all routes being rate limited)
`rate_limits.timeWindow` | The time window in which requests are counted. Default: `60000` (1 minute)
`rate_limits.max` | The maximum number of requests allowed in the time window. Default: `1000`
`rate_limits.maxAnonymous` | The maximum number of requests allowed in the time window for anonymous users. Default: not configured (defaults to `rate_limits.max`)

For additional options, see [fastify-rate-limit](https://github.com/fastify/fastify-rate-limit#options) documentation.


## Support configuration

It is possible to add a [HubSpot Support Widget](https://knowledge.hubspot.com/chatflows/create-a-live-chat) into FlowFuse. This will appear as a floating chat bubble on the bottom-right corner of the screen. To enable this, you'll need to provide the 

Option        | Description
--------------|------------
`support.enabled` | Enables the chat support widget in the UI. Default: `false`
`support.frontend.hubspot.trackingcode` | The numerical identifier within your [HubSpot Tracking Code](https://knowledge.hubspot.com/conversations/chat-widget-is-not-appearing-on-your-pages). Default: `null`


## MQTT Broker configuration

The platform depends on the [Mosquitto MQTT Broker](https://mosquitto.org/) to
provide real-time messaging between devices and the platform.

This is currently an *optional* component - the platform will work without the
broker, but some features will not be available.

Option         | Description
---------------|--------------
`broker.url`   | The full url to the platform broker. This is used by the platform and Node-RED instances to connect to the broker. For example: `mqtt://localhost:1883`.
`broker.public_url` | If set, this is the url provided to Devices to connect to the broker with. When running in a Docker or K8S environment, this url should be the externally addressable url the broker is provided on. This could be via WebSockets, for example: `ws://example.com:1884`

## Logging configuration

By default the forge app is set to `info` level logging, with the HTTP routes logged at `warn`

Option        | Description
--------------|------------
`logging.level` | Change the default logging level. Default: `info`
`logging.http`  | Change the default HTTP route logging level. Default: `warn`
`logging.pretty`| Enable/Disable pretty-printing of the log output. Default: `false` - see below

Setting `logging.http` to `info` will log every HTTP request and response details.

The `pretty` option controls the formatting of the log output. When running in developer
mode, (for example, if `NODE_ENV` is set to `developer`), then pretty formatting is enabled
by default. This makes the logs more human-readable.

Otherwise, the log output is JSON formatted for consumption by other tools.


## File storage

FlowFuse includes a service that can be used by Node-RED instances to read and write files
in their flows as well as providing persistent storage for flow context information.

Details of configuring the File Storage service are available [here](./file-storage/README.md).

The main `flowforge.yml` file needs to contain the following properties so it
can access the File server.

Option        | Description
--------------|------------
`fileStore.url`  | The URL of the FlowFuse File Server to use. Default: not set

## Enabling Persistent File Storage - File Nodes

These nodes are enabled by default on the FlowFuse Cloud platform. If you're
running a self-hosted environment you should follow the next steps.

FlowFuse file nodes replace the core Node-RED file nodes. To make use of these
nodes, the FlowFuse platform Administrator must ensure the core file nodes are 
not loaded.

This is done by adding `10-file.js` in the **Exclude nodes by filename** 
section of your instance settings under the **Palette** section.

This setting is modifiable only by a Team owner and only if it has not been
locked in the [template](/docs/user/concepts.md#template) by the platform Administrator.

[Click here](/docs/user/filenodes.md), to learn more about the usage of the FlowFuse File Nodes.

## Content Security Policy

Option        | Description
--------------|------------
`content_security_policy.enabled` | Enabled `Content-Security-Policy` headers. Default: `false`
`content_security_policy.directives` | Overrides the default set of directives, supplied as a JSON object defined by HelmetJS [here](https://helmetjs.github.io/#content-security-policy)
`content_security_policy.report_only` | Enables reporting only mode. Default: `false`
`content_security_policy.report_uri` |  Provides at URI for reporting to be sent to if enabled