---
navTitle: Custom Hostnames
---

# Custom Hostnames

FlowFuse allows you to point a custom subdomain at your instances, such as `dashboard.example.com`.

This feature is available to:

 - FlowFuse Cloud Enterprise teams
 - Self-hosted FlowFuse Enterprise, running version 2.5 or later with the kubernetes driver

## Configuring a custom hostname

The Custom Hostname option is available under the General Settings tab of your Instance.

Currently, FlowFuse only supports configuring a subdomain such as `dashboard.example.com`. Top level domains cannot be used.

1. Enter your custom subdomain and click save.
2. You will be shown a dialog to confirm the change, as this will require restarting your Instance to apply.
   It also provides information on how to configure your DNS provider.
3. Using your DNS provider, create a `CNAME` record for your chosen subdomain that points at the endpoint provided
   in the dialog.

**Note**: it is important to configure the Instance's Custom Hostname *before* you make the DNS changes. Making
the DNS changes without configuring your Instance may allow someone else to configure their instance to use
your subdomain.

For FlowFuse Cloud, the `CNAME` should point to `custom-loadbalancer.flowfuse.com`. For self-hosted users,
use the information provided in the dialog.

If you also use CAA DNS entries to control which Certificate Authorities can issue certificates for your domains,
you will need to add a record allowing LetsEncrypt to issue certificate. Please see details [here](https://letsencrypt.org/docs/caa/).
The platform will issue certificates using the `http-01` validation method.