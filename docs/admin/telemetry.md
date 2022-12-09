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

It currently supports using [Plausible Analytics](https://plausible.io/) to gather the information.

### Configuring Telemetry

Further details about how users are navigating around your instance of FlowForge can be enabled via [Plausible](https://plausible.io/). This can be enabled with:

```yaml
telemetry:
  enabled: true
  frontend:
    plausible:
      domain: <data-domain>
```

Optionally, you can use a Plausible `extension` too:

```yaml
telemetry:
  enabled: true
  frontend:
    plausible:
      domain: <data-domain>
      extension: local
```

### Collected Data

Details on the metrics gathered through Plausible can be found in the [Plausible Documentation](https://plausible.io/docs/metrics-definitions)

### Schedule 

Plausible tracking is sent as the relevant events are triggered, e.g. as a user navigates between two pages, or as they load the platform.