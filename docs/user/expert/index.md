---
navTitle: FlowFuse Expert
---

# FlowFuse Expert

FlowFuse Expert is the AI built into FlowFuse and the Node-RED editor. It is not a generic AI assistant bolted onto the side of your workflow, it understands your flows, your installed nodes, your live data, and your environment in real time.

**FlowFuse Expert is automatically installed and available in all hosted and remote instances running within or connected to FlowFuse**, no manual installation or configuration required. For self-hosted Enterprise customers, FlowFuse Expert can be enabled on request. [Contact us](https://flowfuse.com/contact-us/) to get it set up on your infrastructure.

## What FlowFuse Expert Can Do

FlowFuse Expert works in two distinct ways inside your environment.

### Chat Interface

The Chat Interface is a conversational AI panel built into the FlowFuse Platform and accessible directly within the Node-RED editor. With agentic flow building enabled, you can describe what you want to build and Expert will build it on your canvas for you. It can also answer questions, debug flows, and query live operational data via MCP.

The Chat Interface supports two modes:
- **Support**: flow-building assistance, including asking questions, debugging, and building flows on the canvas
- **Insights**: query live operational data via MCP tools and resources exposed by your own MCP servers

[Learn more about the Chat Interface](/docs/user/expert/chat/)

### AI in Node-RED

FlowFuse Expert brings AI assistance directly into the Node-RED editor itself. It works where you already are - inside node editors, on the canvas, without requiring you to open a separate panel.

AI features within the Node-RED editor include inline code completions, flow autocomplete, function builder, flow explainer, JSON generation, and CSS and HTML generation for FlowFuse Dashboard.

> **Note:** FlowFuse Expert's in-editor AI features can also be installed as a plugin into Node-RED instances running outside of FlowFuse, using the `@flowfuse/nr-assistant` package from the Node-RED Palette Manager. This requires a FlowFuse Cloud account but does not require a paid subscription for the current release. The Chat Interface is exclusive to FlowFuse and cannot be installed externally.

[Learn more about AI in Node-RED](/docs/user/expert/node-red-embedded-ai/)

## Data Privacy

No data from FlowFuse is used by third-party AI service providers for training models.

Some features utilize the OpenAI API, and as such some data is sent to OpenAI to process requests. In accordance with the [OpenAI Terms of Service](https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance) no data is used for training of future models. OpenAI will retain data sent via its APIs for 30 days for abuse monitoring, after which it is permanently deleted.
