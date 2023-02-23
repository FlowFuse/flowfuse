# Usage Telemetry

The platform shares anonymous usage information with us at FlowForge. This helps
us understand how the platform is being used, what areas need improvement
and how we should prioritise future work.

Ultimately, it helps us produce a better platform for all its users.

We do not collect:
 - Any personally identifiable information. We do store a secure hash of the sending IP address - but the plain value is never stored
 - Any specific details of the flows running on the platform.

## Core Telemetry 

### Configuring Telemetry


By default, usage telemetry is enabled on the platform. The administrator can
opt-out of sharing information as part of the initial setup, or through the Admin
Settings section of the platform UI.

It is also possible to disable in the `flowforge.yml` configuration file. This
overrides whatever option is set in the Admin Settings UI.

**IMPORTANT: Licensed installations cannot disable telemetry**

```yaml
telemetry:
  enabled: false
```

### Collected Data

The following pieces of information are included in the telemetry sent back to us:

```js
{
  instanceId: '5db51f99-c6fb-4340-9c19-78adce58cc1b',
  os: { type: 'Darwin', release: '20.5.0', arch: 'x64' },
  env: { nodejs: 'v16.13.1', flowforge: '0.1.1' },
  platform: {
    counts: {
        users: 0,
        teams: 0,
        projects: 0
    },
    config: {
        driver: 'localfs'
    }
  }
}
```

Property | Description
----|-----
`instanceId` | A unique identifier for the FlowForge instance.
`os` | Information about the operating system
`env` | Node.js and FlowForge versions
`platform.counts` | A snap-shot of the number of users, teams and projects on the platform.
`platform.config.driver` | Which backend driver is being used


When the data is collected, we also store the timestamp the data was received and
a **hash** of the sending IP address - we do not store the plain value.


### Schedule

For the core tracking, the platform will send the telemetry data:
 - 30 seconds after the platform starts up (but only if the platform has already been initialised)
 - Once every 24 hours at a time randomly picked when the platform starts

The data is sent via an HTTP Post to `https://ping.flowforge.com`.

## Frontend Telemetry

The FlowForge UI can be configured to track usage to help understand how users are navigating the pages.

It supports integration with two different services:

- [PostHog](https://posthog.com/) _(recommended)_: You will require your own API key to pass into the `yml`, which will begin the logging of user interactions.
- [Plausible](https://plausible.io/): _(deprecated since 0.9 and will be removed in the future)_: You can setup your own account, and pass the relevant domain to the `yml` in the telemetry configuration. As this
option is deprecated, details of how to configure are no longer provided.

### Configuring Telemetry

Option        | Description
--------------|------------
`telemetry.enabled` | Enables the anonymous usage telemetry of the platform. Default: `true`
`telemetry.frontend.posthog.apikey` | The API key provided to you from your own PostHog account. Default: `null`
`telemetry.frontend.posthog.capture_pageview` | FlowForge is designed as to provide custom posthog `$pageview` events that provide more detail on navigation than the default, and suit a single page application better. As such, we recommend setting this to false in order to prevent duplicate `pageleave`/`pageview` events firing. Default: `true`


```yaml
telemetry:
  enabled: true
  frontend:
    posthog:
      apikey: <api-key>
      capture_pageview: false
```
