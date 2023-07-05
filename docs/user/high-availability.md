---
navTitle: High Availability mode
---

# High Availability mode

High Availability mode allows you to run multiple copies of your Node-RED instance,
with incoming work distributed between them.

The following requirements apply:

 - FlowForge 1.8+ running with an EE license and the kubernetes driver
 - FlowForge Cloud

Within FlowForge Cloud it is currently free to use for all teams, but will
become a chargeable feature in a future release.

## Restrictions


 - Enabling or disabling HA mode requires a restart of the Instance.
 - When in HA mode, two copies of the flows are run.
 - Flows cannot be directly modified in an HA Instance; the editor is disabled.
   A [DevOps Pipeline](./devops-pipelines.md) should be created to deploy new flows to the instance.
 - Any internal state of the flows is not shared between the HA copies.
 - The [FlowForge Persistent Context](./persistent-context.md) is not synchronised
   between the HA copies
 - The logs view show combined logs of all copies. An identifier indicates which replica the log message originates from. You have the possibility to filter the messages.

More details of these restrictions are available below.

## Setting up High Availability mode

To make full use of the HA mode you will need two separate Node-RED instances.

The first will be your development instance. This is where you can build and test
your flows.

The second will be your HA 'production' instance. This instance will run multiple
copies of the flows and get updated from the development instance using a DevOps
Pipeline between the two instances.

To enable HA mode on your production instance, open the [settings page](./instance-settings.md) for your
instance and go to the High Availability section. Click the 'Enable HA mode' button
and confirm the choice in the dialog.

Once enabled the instance will be restarted to apply the settings. Once enabled,
the editor will no longer be available.

## Editing an HA instance

As the editor is disabled for an HA instance the flows cannot be directly modified.

There are two options for updating the flows on an HA instance.

### Disabling HA mode

If you disable HA mode via the setting page, after the instance has been restarted
the editor will be available and changes can be made. However, this will mean a
period of downtime whilst the instance is brought in and out of HA mode.

### DevOps Pipeline

Create a [DevOps pipeline](./devops-pipelines.md) from a 'development' Instance to push updates to your HA
instance.

This allows you to free develop your flows in one instance and when you are happy
with the results, use the pipeline to push the changes over to the HA instance.

## Building HA-ready flows

Whilst FlowForge can help run multiple copies of your flows, and provide the
necessary load balancing between those copies, it still requires the flows to
have been created with HA in mind.

This guide provides some things to consider when building HA-ready flows. We'll
continue to expand on this as we gather more feedback from our users.

There are two things to consider - how state is managed and how work is distributed
between the copies.

### Managing state

The most well-suited flows for HA are those that do not depend on local state being
maintain between individual messages coming into the flow. This is because, in an HA
instance, the messages are distributed between the copies - none of them get to see
every message.

When state is required, it needs to be stored somewhere that all instances can
access it - for example an external database service.

FlowForge provides a [persistent context](./persistent-context.md) option - however
this includes a local caching layer that means it doesn't fully synchronize between
the instances in real time. This is something we'll be working on for a future iteration
of the feature, as it will require some changes in Node-RED to unlock its full potential.

There is also the state that is implicitly maintained within the nodes of a flow.
For example, the Smooth node can be used to calculate a running average value of
messages passing through it. The node does that by keeping in memory the recent
values so it can recalculate the average with each update. In an HA instance,
the node will only be calculating the average for the messages it sees.

### Routing work

When HA is enabled, all HTTP traffic directed at the instance will be load-balanced
between the copies automatically.

It gets a little more complicated where flows connect out to external systems to 
pull in work - for example, when using MQTT.

MQTT includes a feature called [Shared Subscriptions](https://www.hivemq.com/blog/mqtt5-essentials-part7-shared-subscriptions/)
that allows a broker to distribute messages between a group of subscribers. This
provides the load balancing needed for an HA instance - but the flow must be configured
to use the appropriate shared subscription topics, as well as to not set a ClientID on the connection to avoid conflicts between the connections.

The [Project Nodes](./projectnodes.md) have been updated to support shared subscriptions
automatically when running in HA mode.

There are lots of other nodes that can be used to trigger flows, whether by
listening for events on an API, connecting to locally attached hardware and many
things in between. Typically, those that are more cloud-aligned, such as messaging
systems like Kafka and AMQP will have very well established ways of doing load
balancing.





