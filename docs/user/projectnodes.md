---
navTitle: FlowFuse Project Nodes
meta:
   description: Send messages and call flows between Node-RED instances and remote instances in a team or application with the Project In, Out and Call nodes.
---

# FlowFuse Project Nodes

Node-RED instances running within FlowFuse include a set of nodes that make it
very quick and easy to securely send and receive messages between different
instances in a team.

The nodes act in a similar way to the Node-RED Link nodes, but by allowing the
links to extend between different instances, they open up a wide range of
possibilities. Remote instances can take part too.

For example, a single Node-RED instance may contain a set of utility flows that
you want to reuse in other instances. Rather than copy the flows around, the
Project Nodes allow you to easily call those flows and get the result back. The
flows stay in one place, so a change to them applies to every caller at once,
with the trade-offs covered in [Limitations](#limitations).

The project nodes are included in every FlowFuse product: Edge, Hub and Fleet.

### Nodes

There are three nodes in this collection:

 - `Project In` - listens for messages being broadcast by other Node-RED instances, or for
   messages being sent just to this instance
 - `Project Out` - sends messages to other Node-RED instances
 - `Project Call` - sends messages to other Node-RED instances and waits for a response

The nodes send the whole `msg` object. Due to the way the nodes
encode messages, there are some data types that do not get sent. For example,
the `msg.req`/`msg.res` properties used by the core HTTP nodes will not be sent.
Instead, they are temporarily removed from the message and re-attached when the
message is received back.

Each node is configured with a topic on which it either sends or receives messages
on. This is similar in concept to MQTT topics - although the nodes do not currently
support using MQTT wildcards in their topics. The topic can also be set when the flow
runs, see [Choosing the topic at runtime](#choosing-the-topic-at-runtime).

The Project Out nodes can either broadcast messages on a topic to anyone listening,
or they can send messages on a topic to a specific other instance.

The Project In nodes do the opposite - they can either listen for messages being
broadcast, or for messages sent directly to them.

The Project Call node can be used to send a message to another Project In node
and then wait for a response, with a built-in timeout if it doesn't arrive.
The response is sent back using a Project Out node configured to respond to the call
node.

### Applications

The application features need FlowFuse v3.3 or later (already available on FlowFuse
Cloud) and `@flowfuse/nr-project-nodes` v1.0.0 or later on every instance that uses
them, remote instances included. Older versions of the nodes keep working with team
broadcasts and hosted instance targets.

The list of targets and sources offered by the nodes is grouped by application.
Use the **Application** filter above the list to show a single application. The list
contains the hosted instances in your team and the remote instances assigned to an
application. `Project Out` and `Project Call` can target either, including remote
instances assigned to an application.

Broadcast messages are sent on one of two channels. Choose the channel with the
**Channel** option on the `Project In` and `Project Out` nodes:

 - **Team** - received by any instance or remote instance in the team whose
   `Project In` node listens on the Team channel. This is the default.
 - **Application** - only received by instances and remote instances in the same
   application whose `Project In` node listens on the Application channel. Instances
   outside the application cannot send or receive these messages.

The channels are separate. A `Project In` node listening on the Team channel does
not receive Application channel broadcasts, even from an instance in the same
application.

Received messages include `msg.projectLink.applicationId`, the application of the
sender, and for broadcasts `msg.projectLink.scope`, the channel it was sent on.

### Choosing the target at runtime

`Project Out` and `Project Call` can read their target from the message as it is sent,
instead of using the instance chosen in the editor. This needs
`@flowfuse/nr-project-nodes` v1.0.0 or later. Set **Target** to `msg.` and give a
property name (it defaults to `msg.target`), or to `env` to read it from an environment
variable. An `env` value can also be a template such as `${PREFIX}-${NAME}`. The value
must be the id of an instance or remote instance in your team.

A remote instance is identified by `dev:` followed by its id. For example, a Function
node can set ``msg.target = `dev:${deviceId}` ``, or the `env` value can be
`dev:${TARGET_DEVICE_ID}`.

The nodes do not ask FlowFuse whether the target exists. A value that is missing or is
not a valid id raises an error that a Catch node can handle. A valid id for an instance
that does not exist sends the message nowhere, so a `Project Call` node reports a timeout.

### Choosing the topic at runtime

The topic of a node can also be set when the flow runs, instead of typing it into the
editor. This needs `@flowfuse/nr-project-nodes` v1.0.0 or later.

Set **Topic** to `env` and give an environment variable name, or a template such as
`some/topic/${FF_DEVICE_NAME}/status`. `Project Out` and `Project Call` can also use
`msg.` and a property name (it defaults to `msg.topic`) to read the topic from each
message.

`Project In` reads its topic once, when the node starts, so it can use `env` but not
`msg.`.

This lets the same flows be deployed to many instances or remote instances, each using
a topic of its own. FlowFuse sets some [environment variables](./envvar.md) for you,
which are handy for this.

An invalid topic, or an environment variable that is not set, raises an error that a
Catch node can handle. A `Project In` node shows an invalid topic status and does not
listen.

### Limitations

**Remote instances assigned to an instance are reached through that instance.** They
share the identity of the instance they are assigned to, so they are not listed
separately. A message or call sent to the instance is also received by its remote
instances that are listening on the same topic.

**Calls need the target to be up.** The `Project Call` node waits for its
timeout (5 seconds by default for new nodes), then logs an error that can be caught with a Catch node.
The target instance must be running and have a `Project In` node listening on the same
topic. Because every call travels through the platform's broker, logic called this
way is unavailable to a caller whose connection to the platform is down.

**Load is shared only in HA mode.** The instance holding the called flows serves every
caller from a single Node-RED runtime. In [High Availability mode](./high-availability.md)
the nodes automatically switch to MQTT shared subscriptions, so calls are distributed
between the copies.

### GitHub

The nodes are published under an Apache-2.0 license and available on [GitHub](https://github.com/FlowFuse/nr-project-nodes).
