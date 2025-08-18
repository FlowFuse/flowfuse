---
navTitle: FlowFuse MQTT Nodes
---

# FlowFuse MQTT Nodes

Node-RED instances running within FlowFuse include a set of nodes that make it
simple to securely connect and send or receive messages between MQTT clients
in your team or externally connected clients via the [Team Broker](/docs/user/teambroker/#getting-started-with-team-broker).

The nodes are very similar to the Node-RED MQTT nodes, but without the need
to configure any settings making integration seamless.


### Nodes

There are two nodes in this collection:

 - `MQTT In` - subscribes to fixed or dynamic topics
 - `MQTT Out` - publishes messages to fixed or dynamic topics

The `MQTT In` node receives messages from the topic defined in the node's
configuration or the `msg.topic` property if it is set.

The `MQTT Out` node sends the `msg.payload` value to the topic defined in the node's
configuration or the `msg.topic` property if it is set.

See the built-in help on the Node-RED sidebar for more information about using these nodes.


### GitHub

The nodes are published under an Apache-2.0 license and available on [GitHub](https://github.com/FlowFuse/nr-mqtt-nodes).
