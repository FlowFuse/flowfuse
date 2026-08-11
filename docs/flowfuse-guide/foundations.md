---
navTitle: Foundations
navOrder: 1
meta:
   description: What FlowFuse is, the core pieces it gives you, and how code is shared across teams.
---

# Foundations

This is the foundation to build on: what FlowFuse is, what its core pieces are, and how code is shared across teams. The aim is to turn an app idea into FlowFuse pieces you can name and say in one sentence.

## The big picture

![The FlowFuse platform as an umbrella over a stack of Hosted Instances, a Dashboard, the Team Broker and FlowFuse Tables, with a dashed Device Agent box below it wrapping a stack of Remote Instances that fan out to a PLC, an IO module, a gateway, an embedded controller and a LoRaWAN gateway.](./images/foundations-platform-and-edge.svg){data-zoomable}

The platform runs and connects your Node-RED instances. The Device Agent bridges the platform to the edge.

## The core pieces

- **Single platform**: manage, secure, and govern everything from one place.
- **Instances**: Node-RED runtimes. A Hosted Instance runs on FlowFuse-managed infrastructure, either in the cloud or on your own server. A Remote Instance runs on your own edge hardware, through the [Device Agent](/docs/device-agent/). It is the same Node-RED, managed the same way. They differ only in where the runtime lives.
- **[Team Broker](/docs/user/teambroker/)**: a shared message bus that ties data together across sites.
- **Database**: one shared operational data store.
- **Dashboards**: operator-facing UIs for the people who run it.
- **Edge and device management**: deploy and manage across many devices, lines, and plants.

A Remote Instance lives in both worlds. It can be edge execution down in OT, or an on-prem worker under an IT or cloud platform.

That is the mental model in plain language. For the full glossary, every FlowFuse piece and term (Applications, Instances, [Snapshots](/docs/user/snapshots/), [Pipelines](/docs/user/devops-pipelines/), Team Broker, [Tables](/docs/user/ff-tables/), Remote Instances and more), see the [FlowFuse Concepts](/docs/user/concepts/) documentation.

## The method, in four moves

1. **Say what it does.** One plain sentence. No nouns you would have to explain.
2. **Pick the package.** Match it to a package, often several. Most real apps are more than one piece.
3. **Decide where data goes.** Choose the target or targets: FlowFuse Tables for relational data, an external time-series database, the Team Broker, or a single service.
4. **Read off the sentence.** Package plus target is the architecture, stated in one line.

## How code gets shared

Code moves in two ways in FlowFuse. You can promote a whole app through environments, or you can compose an app from shared parts. Either way, the question is the same: how a build reaches every place that should run it.

When development and production sit on separate servers, a GitHub bridge carries the versioned code between them. That bridge is an architecture decision, not a detail.
