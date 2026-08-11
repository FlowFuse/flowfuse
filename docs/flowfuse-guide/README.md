---
navGroup: Guides
navGroupOrder: 2
navOrder: 1
navTitle: Designing FlowFuse applications
meta:
   description: Turn an app idea into FlowFuse pieces you can name and an architecture you can say in one sentence.
---

# Designing FlowFuse applications

Most real applications are more than one piece. This guide is about naming those pieces
before you build them: which shape the app takes, where its data goes, and where it runs.

The goal is an architecture you can say in one sentence. Once you can say it, the flow shape
follows from it, and so does the decision about what to deploy where.

For the definition of any term used here, see the
[FlowFuse concepts documentation](/docs/user/concepts/).

## The method, in four moves

1. **Say what it does.** One plain sentence, with no nouns you would have to explain.
2. **Pick the package.** Match it to a package, and often to several, because most real
   applications are more than one piece.
3. **Decide where data goes.** Choose the targets: FlowFuse Tables for relational records, an
   external time-series database, the Team Broker, or a single service.
4. **Read off the sentence.** Package plus target is the architecture, stated in one line.

## In this guide

- **[Foundations](/docs/flowfuse-guide/foundations/)**
  What FlowFuse is, its core pieces, and how code is shared across teams.

- **[App delivery methods](/docs/flowfuse-guide/app-delivery/)**
  Ship the whole app through environments, or publish one reusable piece the team installs.

- **[Hardware apps](/docs/flowfuse-guide/hardware-apps/)**
  The three shapes an app takes when it runs on hardware at the edge.

- **[Software apps](/docs/flowfuse-guide/software-apps/)**
  The three shapes an app takes when it runs on the platform.

- **[Data plane](/docs/flowfuse-guide/data-plane/)**
  Where data goes: two stores built in, everything else you bring and expose yourself.

- **[Architectures](/docs/flowfuse-guide/architectures/)**
  The same building blocks, arranged for where they run, plus the dev and prod split.

- **[OT architectures](/docs/flowfuse-guide/architectures-ot/)**
  Near the equipment: edge deployments, consolidation, and air-gapped sites.

- **[IT architectures](/docs/flowfuse-guide/architectures-it/)**
  Hosting and governing: on-prem, your own cloud, and enterprise governance.

- **[IIoT architectures](/docs/flowfuse-guide/architectures-iiot/)**
  The live data backbone, where the edge publishes once and many subscribe.

- **[Worked example](/docs/flowfuse-guide/worked-example/)**
  OEE end to end, from the edge to the broker to the cloud to history.

