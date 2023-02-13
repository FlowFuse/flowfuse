---
navGroup: Overview
navTitle: FlowForge Cloud
---

# FlowForge Cloud

FlowForge Cloud is a hosted service allowing users to sign-up and start creating teams and projects without having to install and manage their own instance of FlowForge.
The [Concepts](../user/concepts.md) remain the same, however FlowForge Inc. is the administrator of the platform.

## Billing

Customers are billed at the team level for each project they create. This is a recurring monthly charge.
See the [Billing](./billing.md) page for more detailed answers about billing.

## Support

Customers can get support by emailing support@flowforge.com, we presently only offer support for the flowforge application and your account, any issues relating to Node-RED such as your flows or a 3rd party node should be raised in the appropriate community forum, for example https://discourse.nodered.org/ or the GitHub project of the third party node.

### Requesting a new verification email

When a user signs up for FlowForge Cloud an email will be send to verify it.
If this email doesn't get delivered one can be resend by signin in to FlowForge
and click the button to resend it.

## Node-RED on FlowForge Cloud

FlowForge currently offers Node-RED 2.2 and 3.0 to customers. When creating a
new project a [Stack](../user/concepts.md#project-stack) is chosen, which later
can be [upgraded to a later version](../user/changestack.md).

Each Node-RED can install custom modules as advertised in the [Flow Library](https://flows.nodered.org).

## Use of the File System

FlowForge Cloud provides support for using the standard File nodes in flows with
some limits. The standard filesystem is not persisted between project restarts,
so a custom set of nodes are used to store the files in persistent storage.

Each Project has a quota of `100MB` of file storage. A single write operation is
limited to `10MB` in size.

Some 3rd party nodes try to access the filesystem directly. This can lead to
unpredicatable results if the data is not persisted between restarts.

## Node-RED context

Node-RED Context can be used to store small pieces of project state within the
runtime. By default this is stored in memory only.

FlowForge Cloud provides an optional context store that can be used to persist
the data.

Persistent context has a quota limit set at `1MB` per project.

## Network Connections

### HTTP(S) & Websockets

Projects expose an HTTPS interface on port 443 with each project having its own hostname (example.flowforge.cloud), Plain HTTP requests to port 80 will receive a redirect to HTTPS on port 443.
You MUST connect using the hostname not the IP address to reach your project.
Websocket connections over SSL (wss:) are also supported.

The payload size per request is limited to 5MB, which is the Node-RED default.
When a request exceeds this limit, the whole request is rejected with a `413 Payload Too Large` error.

### TCP and UDP

Incoming TCP or UDP connections will not work, the TCP and UDP Nodes have therefore been removed

### MQTT
MQTT Connections to an external broker using the standard MQTT nodes will work fine as the connection is initiated by Node-RED.

### IP Addresses
Outbound connections from FlowForge will always come from the IP address `63.33.85.112`. 
This can make access to a remote database or corporate network possible where those systems are protected by IP address filtering firewalls. As mentioned in HTTP above, incoming connections MUST be to the hostname not the IP address.

## Single-Sign On

FlowForge supports configuring SAML-based Single Sign-On for particular email domains.

This can be configured on request for FlowForge Cloud by submitted a support request
via our [Contact Us](https://flowforge.com/contact-us/) page.

You must have the ability to configure an SAML endpoint on your Identity Provider,
and have authority to configure SSO for your email domain.

We have currently validated our SSO support with the following Identity Providers:

 - Google Workspace
 - OneLogin

If you are using a different Identity Provider, please still get in touch and we
can evaluate what will be required to enable it.
