---
navTitle: FlowFuse Expert
---

# FlowFuse Expert

FlowFuse Expert is the AI built into FlowFuse and the Node-RED editor. It understands your flows, installed nodes, live data, and environment in real time.

**FlowFuse Expert is installed automatically in all hosted and remote instances running within or connected to FlowFuse**, with no setup required. Self-hosted Enterprise customers can enable it on request, [contact us](https://flowfuse.com/contact-us/) to set it up on your infrastructure.

> **Note:** On self-hosted installations, FlowFuse Expert requires an Enterprise license and the platform's EMQX-based MQTT broker with the Team Broker capability enabled (see [MQTT Broker configuration](/docs/install/configuration/#mqtt-broker-configuration)). Installations running without EMQX cannot enable Expert.

## Managing AI Features

**Team owners** enable or disable all AI features for their team from the team settings page. Disabling removes the Expert chat panel and all AI features for that team. Running instances need a restart for the change to take full effect.

**Self-Hosted Enterprise admins** have two additional controls:
- Disable AI across the entire platform via the `ai.enabled` [configuration option](/docs/install/configuration/#ai-configuration). This overrides all team-level settings.
- Configure which AI features are available per team type from the Admin Panel. See [Managing Team Types](/docs/admin/introduction/#managing-team-types) for details.

## What FlowFuse Expert Can Do

FlowFuse Expert works in two ways.

### Chat Interface

The Chat Interface is a conversational AI panel in the FlowFuse platform, also available inside the Node-RED editor. Describe what you want to build and Expert builds it on your canvas. It also answers questions, debugs flows, and queries live operational data.

The Chat Interface has two modes:
- **Support**: flow-building help, including asking questions, debugging, and building flows on the canvas. Expert can ask clarifying questions, propose a plan before acting, and ask for approval before running actions. It can also act across the platform, such as looking up your instances and creating new ones.
- **Insights**: query live operational data through MCP tools and resources exposed by your own MCP servers, on both hosted and remote instances.

[Learn more about the Chat Interface](/docs/user/expert/chat/)

### AI in Node-RED

FlowFuse Expert also brings AI assistance into the Node-RED editor itself, inside node editors and on the canvas, without a separate panel.

In-editor AI features include inline code completion, flow autocomplete, function builder, flow explainer, JSON generation, and CSS and HTML generation for FlowFuse Dashboard.

> **Note:** FlowFuse Expert's in-editor AI features can also be installed as a plugin in Node-RED instances running outside of FlowFuse, using the `@flowfuse/nr-assistant` package from the Node-RED Palette Manager. This requires a FlowFuse Cloud account but no paid subscription for the current release. The Chat Interface is exclusive to FlowFuse and cannot be installed externally.

[Learn more about AI in Node-RED](/docs/user/expert/node-red-embedded-ai/)

## Using Your Own AI Agent

Connect your own AI agent, such as Microsoft Copilot, ChatGPT or Claude, to manage your platform and build and edit flows in your Node-RED instances. It acts on the same capabilities as FlowFuse Expert, through the [FlowFuse MCP server](/docs/user/mcp/).

[Learn more about connecting your own agent](/docs/user/expert/third-party-agents/)

## Data Privacy

No data from FlowFuse is used by third-party AI service providers for training models.

Some features use the OpenAI API, so some data is sent to OpenAI to process requests. In accordance with the [OpenAI Terms of Service](https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance), no data is used to train future models. OpenAI retains data sent via its APIs for 30 days for abuse monitoring, after which it is permanently deleted.
