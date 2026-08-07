---
navTitle: FlowFuse Project Nodes
---

# FlowFuse Project Nodes

Node-RED instances running within FlowFuse include a set of nodes that make it
very quick and easy to securely send and receive messages between different
instances in a team.

The nodes act in a similar way to the Node-RED Link nodes, but by allowing the
links to extend between different instances, they open up a wide range of
possibilities. Remote instances can take part too, with the limitations described
below.

For example, a single Node-RED instance may contain a set of utility flows that
you want to reuse in other instances. Rather than copy the flows around, the
Project Nodes allow you to easily call those flows and get the result back. The
flows stay in one place, so a change to them applies to every caller at once,
with the trade-offs covered in [Limitations](#limitations).

The project nodes are only available in the Enterprise tier of FlowFuse.

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
support using MQTT wildcards in their topics.

The Project Out nodes can either broadcast messages on a topic to anyone listening,
or they can send messages on a topic to a specific other instance.

The Project In nodes do the opposite - they can either listen for messages being
broadcast, or for messages sent directly to them.

The Project Call node can be used to send a message to another Project In node
and then wait for a response, with a built-in timeout if it doesn't arrive.
The response is sent back using a Project Out node configured to respond to the call
node.

### Limitations

**Only hosted instances can be addressed directly.** The list of targets and sources
offered by the nodes is the hosted instances in your team. This applies to the
`Project Out` node when sending to a specific instance, the `Project In` node when
listening to a specific source, and the `Project Call` node's target.

**A remote instance can send, but cannot be sent to.** Flows on a remote instance can
use `Project Out` and `Project Call` to reach a hosted instance, and can receive
broadcasts. They cannot be named as a target, so shared logic being called by others
has to live on a hosted instance. A remote instance assigned to an application cannot
receive direct messages at all, and can only listen for broadcasts.

**Calls need the target to be up.** The `Project Call` node waits for the default
timeout of 30 seconds, then logs an error that can be caught with a Catch node. The
target instance must be running and have a `Project In` node listening on the same
topic. Because every call travels through the platform's broker, logic called this
way is unavailable to a caller whose connection to the platform is down.

**Load is shared only in HA mode.** The instance holding the called flows serves every
caller from a single Node-RED runtime. In [High Availability mode](./high-availability.md)
the nodes automatically switch to MQTT shared subscriptions, so calls are distributed
between the copies.

### GitHub

The nodes are published under an Apache-2.0 license and available on [GitHub](https://github.com/FlowFuse/nr-project-nodes).
