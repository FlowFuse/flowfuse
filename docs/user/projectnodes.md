---
navTitle: FlowForge Project Nodes
---

# FlowForge Project Nodes

Node-RED instances running within FlowForge include a set of nodes that make it
very quick and easy to securely send and receive messages between different
instances in a team.

The nodes act in a similar way to the Node-RED Link nodes, but by allowing the
links to extended between different instances, they open up a wide range of
possibilities.

For example, a single Node-RED instance may contain a set of utility flows that
you want to reuse in other instances. Rather than copy the flows around, the
Project Nodes allow you to easily call those flows and get the result back.

### Nodes

There are three nodes in the Project Node collection:

 - `Project In` - listens for messages being broadcast by other Node-RED instances, or for
   messages being sent just to this instance
 - `Project Out` - sends messages to other Node-RED instances
 - `Project Call` - sends messages to other instances and waits for a response

The nodes send the whole `msg` object. Due to the way the nodes
encode messages, there are some data types that do not get sent. For example,
the `msg.req`/`msg.res` properties used by the core HTTP nodes will not be sent.

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

### GitHub

The nodes are published under an Apache-2.0 license and available on [GitHub](https://github.com/flowforge/flowforge-nr-project-nodes).
