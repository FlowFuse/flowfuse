---
navGroup: Guides
navGroupOrder: 2
navOrder: 2
navTitle: Designing Node-RED flows
meta:
   description: Turn an architecture sentence into a Node-RED flow shape you can read at a glance.
---

# Designing Node-RED flows

Node-RED is a visual programming platform for integration and logic. You build by wiring
pre-built nodes into flows. The connectors and the syntax are handled for you, so your effort
goes into what the system should do, the logic, rather than the plumbing that connects things
or the boilerplate of a language.

This guide is about shape. It takes an architecture sentence and turns it into a flow you can
read at a glance, then covers the patterns, the data handling and the operational habits that
keep it readable once it is running.

It assumes you know what a node and a flow are. If you do not, start with the
[Node-RED concepts documentation](https://nodered.org/docs/user-guide/concepts).

## The method, in four moves

1. **List the beginnings.** Every way work enters the piece: an `http in`, an MQTT in, an
   inject. Each beginning is its own path.
2. **Name the shared services.** The pools and calls that many paths depend on: a database
   pool, a model call, the broker. You call them, and results return.
3. **Pick the single sink.** The one sink each family of paths converges on. It responds. It
   routes nothing.
4. **Draw the shape.** Paths across, services called in the middle, one sink each. Now you can
   read the flow at a glance.

## In this guide

- **[Foundations](/docs/node-red-guide/foundations/)**
  The handful of concepts you need to build with Node-RED, and how they fit together.

