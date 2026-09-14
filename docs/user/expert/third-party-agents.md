---
navTitle: Connect Your Own Agent
---

# Connect Your Own Agent

**Introduced in FlowFuse 3.0**

You can connect your own AI agent to FlowFuse. The agent your team already uses can manage your platform and build and edit the flows inside your Node-RED instances.

Because the agent is yours, so is the model it runs on.

## Connect your agent

Any MCP client that supports the HTTP transport can connect. That is the only requirement.

Pick your agent for the address to copy and the steps that apply to it:

::agent-setup-tabs{:exclude-expert="true" :signup="false" surface="docs"}
::

The same three steps, written out:

1. **Add the FlowFuse MCP address in your agent's connector settings.** See [where to add it, per agent](#where-to-add-it-per-agent) if you are not sure where yours lives.

   On FlowFuse Cloud:

   ```
   https://app.flowfuse.com/mcp
   ```

   Self-hosted, substitute your own platform address:

   ```
   https://flowfuse.example.com/mcp
   ```

2. **Sign in.** FlowFuse uses OAuth, so your agent sends you to a FlowFuse login page to authenticate, in the same way as any other application you sign in to. If your client asks for an OAuth client ID or secret, leave them blank. FlowFuse registers your client for you.

3. **Choose what the agent may do.** As part of signing in you decide which teams the agent may act on, and whether it has editing rights or read access only.

Your agent is now connected. OAuth lets you connect by signing in. If your MCP client does not support OAuth, use a token instead, covered in [clients without a sign-in flow](#clients-without-a-sign-in-flow).

> **Note:** This is separate from [MCP server nodes](https://flowfuse.com/node-red/flowfuse/mcp/). Those let you build MCP servers inside your flows, connected to anything you like, to give any AI a set of tools of your own design. This page is about operating FlowFuse itself through MCP, where FlowFuse is the server and your agent is the client.

## What your agent can do, and what you grant

Ask your agent what it can do in a given team or instance if you want the current picture, since its tools reflect the instance it is connected to.

**With read access**, an agent can see your teams and applications with their activity history, your hosted and remote instances with their live status and runtime logs, your snapshots, and your FlowFuse Tables databases including table schemas and row data. It can also see which instance types, templates and blueprints your team has available.

**With editing rights**, it can additionally create applications and hosted instances, register remote instances and assign them to applications, take snapshots, and build and edit flows.

An agent with read access has no ability to change anything.

An agent can query your FlowFuse Tables data to answer questions. With editing rights it can go further and build a flow with a [Query Node](/docs/user/ff-tables/#query-nodes) that reads and writes your tables, exactly like a flow you would build yourself.

### Deleting, and deploying

Nothing an agent can do through FlowFuse deletes anything, for now. There is no tool for deleting an instance, an application, a snapshot or a team. Deploying is also done by you, for the same reason.

We are focused on delivering AI in a meaningful way that can act as required both in production setups and in setups where experimentation is permitted, so expect this to develop.

## Editing flows

Asking about your platform needs nothing open. Editing flows happens in a live Node-RED editor, so that you can see the work as it happens on the canvas rather than receiving a result you have to go and check. Working in the running editor also means the agent gets Node-RED's own validation back as it goes, so it catches and corrects its own mistakes rather than handing you a flow that will not load.

When you ask for flow work, your agent will guide you to connect an editor session. In the platform header there is a control for indicating which of your current browser sessions the agent should work in, so if you have several open you can point it at the right one. Ending the session, or closing the tab, ends the agent's access to your editor. Switching team also ends it.

## Where to add it, per agent

The agents below are the common ones and where their settings live. Every other AI Agent that supports MCP over HTTP connects the same way.

### Microsoft Copilot

In **Copilot Studio**, open your agent's **Tools** page, select **Add a tool**, then **New tool**, then **Model Context Protocol**. Give the server a name and a description saying what it is for, since the orchestrator uses that description to decide when to call it, and enter the FlowFuse MCP address as the server URL.

To make FlowFuse available across a Microsoft 365 tenant rather than in a single agent, a tenant administrator registers it in the Microsoft 365 admin center. Once approved it appears in Copilot Studio for everyone.

Access through Copilot Studio runs over Power Platform connectors, so any Power Platform data policy your organisation has also governs it.

### ChatGPT

Custom connectors live behind developer mode. Turn it on under **Settings**, then **Apps & Connectors**, then **Advanced settings**, then add FlowFuse by URL and sign in. Developer mode needs a paid plan, so it is not available on the free tier.

### Claude

Where custom connectors are available on your plan, add one and enter the FlowFuse MCP address.

On Team and Enterprise plans an owner adds the connector for the organisation first, and then each person connects and signs in individually.

### Command-line and editor agents

Claude Code, Cursor, Visual Studio Code and Gemini CLI all connect to the same address. Where a client supports OAuth, sign in; otherwise use a token, see [clients without a sign-in flow](#clients-without-a-sign-in-flow).

For Claude Code:

```bash
claude mcp add --transport http flowfuse https://app.flowfuse.com/mcp
```

### Local and self-hosted models

Use any HTTP-capable MCP client, such as LM Studio, LibreChat or Open WebUI, pointed at your own model, and add the FlowFuse address as a server in that client's configuration. Note that Ollama is a model runtime rather than an agent, so it needs an MCP client in front of it.

## Clients without a sign-in flow

Where your client does not support OAuth, give it a token in its configuration file instead. Both routes reach the same FlowFuse with the same enforcement.

Create a [Personal Access Token](/docs/user/user-settings/#personal-access-tokens) and [scope it](/docs/user/user-settings/#scoping-a-token) the same way you would when signing in, to the team you want the agent working in rather than to everything you can reach. Then give the client the FlowFuse address together with that token as a bearer token in an `Authorization` header.

How that is written down belongs to the client rather than to FlowFuse. Two JSON shapes are in common use, one keyed on `servers` and one keyed on `mcpServers`, and clients also differ on where the file lives and whether they accept headers at all, so follow your own client's configuration reference. For the two shapes, see the [`servers` reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration) and the [`mcpServers` reference](https://modelcontextprotocol.io/docs/develop/connect-local-servers).

## Approvals and audit

FlowFuse tools carry their recommended usage and permissions, so a connected agent knows what each one is for before it calls it. Most MCP clients then ask you to confirm before they run a tool. That prompt belongs to the client rather than to FlowFuse, so how it looks, and whether you can turn it off, differs between them. FlowFuse Expert's own approval cards are a first-party feature and do not apply here.

What FlowFuse enforces on every call is what you granted: the teams, and read access or editing rights. That is the granularity. It is a boundary around what an agent can reach rather than a per-tool allow list, and it applies the same way whether the grant came from signing in or from the scope on an access token.

Actions an agent takes appear in the [audit log](/docs/user/logs/#ai-agents-and-api-activity), attributed to your account and marked as having come from a connected agent.

## If something is not working

**A change was refused.** The agent has read access only. Re-connect it and grant editing rights.

**The agent cannot reach a team.** That team was not included when you signed in. Re-connect and include it.

**The agent cannot see the instance you mean.** Flow and editor work runs in a connected editor session. Ask your agent to list your sessions and connect to the right one.

## Getting the best out of it

None of this is something to set up before you start. Your agent will tell you when something is in the way, and can help resolve it.

For the smoothest experience, an instance the agent works in should be on a current launcher or Device Agent, with a current in-editor assistant. These update when an instance restarts, so a long-running instance may be behind. If an agent cannot do something you expected in a particular instance, this is usually why, and asking the agent about it is the quickest route.

On self-hosted, platform messaging runs over the MQTT broker, so the Team Broker needs to be available. Whether anything is needed from you depends on how your platform was installed; see [MQTT Broker configuration](/docs/install/configuration/#mqtt-broker-configuration). AI features also require an Enterprise licence with AI enabled.
