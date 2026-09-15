---
navTitle: Connect Your Own Agent
---

# Connect Your Own Agent

**Introduced in FlowFuse 3.0**

Connect your own AI agent to FlowFuse to manage your platform and build and edit flows in your Node-RED instances. You bring the agent and the model it runs on.

## Connect your agent

Any MCP client with HTTP transport support can connect. That is the only requirement.

Pick your agent for the address and the steps that apply to it:

::agent-setup-tabs{:exclude-expert="true" :signup="false" surface="docs"}
::

The same three steps, written out:

1. **Add the FlowFuse MCP address in your agent's connector settings.** See [where to add it, per agent](#where-to-add-it-per-agent) for yours.

   On FlowFuse Cloud:

   ```
   https://app.flowfuse.com/mcp
   ```

   Self-hosted, substitute your own platform address:

   ```
   https://<your-flowfuse.domain>/mcp
   ```

2. **Sign in.** FlowFuse uses OAuth, so your agent sends you to a FlowFuse login page. If your client asks for an OAuth client ID or secret, leave them blank; FlowFuse registers your client for you.

3. **Choose what the agent may do.** Signing in takes you to a FlowFuse authorization page. There you pick read-only or full access, scope it to all your teams or specific teams, and set an expiration date for the grant.

Your agent is now connected. If your client does not support OAuth, use a token instead, see [clients without a sign-in flow](#clients-without-a-sign-in-flow).

> **Note:** This is separate from [MCP server nodes](https://flowfuse.com/node-red/flowfuse/mcp/), which build MCP servers inside your flows. This page is about operating FlowFuse itself, where FlowFuse is the server and your agent is the client.

## What your agent can do

A connected agent works in two areas:

- **[Platform automation](/docs/user/mcp/#platform-automations)**: manage your teams, applications, hosted and remote instances, snapshots and more.
- **[Flow building](/docs/user/mcp/#flow-building)**: read, build and edit the flows in your Node-RED instances.

What it can do in a given team or instance reflects the access you granted. See the [FlowFuse MCP server](/docs/user/mcp/) page for the full list.

Flow work runs in a live Node-RED editor session. When you ask for it, the agent guides you to connect a session; a control in the platform header selects which of your open browser sessions it works in.

## Where to add it, per agent

The common agents and where their settings live. Any other MCP-over-HTTP agent connects the same way.

### Microsoft Copilot

In **Copilot Studio**, open your agent's **Tools** page, select **Add a tool**, then **New tool**, then **Model Context Protocol**. Give the server a name and a description (the orchestrator uses the description to decide when to call it), and enter the FlowFuse MCP address as the server URL.

To make FlowFuse available across a Microsoft 365 tenant rather than in a single agent, a tenant administrator registers it in the Microsoft 365 admin center. Once approved it appears in Copilot Studio for everyone.

Access through Copilot Studio runs over Power Platform connectors, so any Power Platform data policy your organisation has also governs it.

### ChatGPT

Custom connectors live behind developer mode. Turn it on under **Settings**, then **Apps & Connectors**, then **Advanced settings**, then add FlowFuse by URL and sign in. Developer mode requires a paid plan.

### Claude

Where custom connectors are available on your plan, add one and enter the FlowFuse MCP address.

On Team and Enterprise plans an owner adds the connector for the organisation first, then each person connects and signs in individually.

### Command-line and editor agents

Claude Code, Cursor, Visual Studio Code and Gemini CLI all connect to the same address. Where a client supports OAuth, sign in; otherwise use a token, see [clients without a sign-in flow](#clients-without-a-sign-in-flow).

For Claude Code:

```bash
claude mcp add --transport http flowfuse https://app.flowfuse.com/mcp
```

### Local and self-hosted models

Use any HTTP-capable MCP client, such as LM Studio, LibreChat or Open WebUI, pointed at your own model, and add the FlowFuse address as a server. Ollama is a model runtime, not an agent, so it needs an MCP client in front of it.

## Clients without a sign-in flow

If your client does not support OAuth, give it a token in its configuration file instead. Both routes reach the same FlowFuse with the same enforcement.

Create a [Personal Access Token](/docs/user/user-settings/#personal-access-tokens), [scope it](/docs/user/user-settings/#scoping-a-token) to the team you want the agent working in, and give the client the FlowFuse address with that token as a bearer token in an `Authorization` header.

The config format is the client's, not FlowFuse's. Two JSON shapes are common, one keyed on `servers` and one on `mcpServers`; clients also differ on where the file lives and whether they accept headers. Follow your client's reference: the [`servers` shape](https://code.visualstudio.com/docs/agents/reference/mcp-configuration) and the [`mcpServers` shape](https://modelcontextprotocol.io/docs/develop/connect-local-servers).

## Approvals and audit

Each FlowFuse tool carries its recommended usage and permissions, so a connected agent knows what it is for before calling it. Most MCP clients then ask you to confirm before running a tool. That prompt is the client's, not FlowFuse's, so its look and whether you can turn it off vary. FlowFuse Expert's own approval cards do not apply here.

What FlowFuse enforces on every call is your grant: the teams, and read-only or full access. Each tool carries the access it needs, and FlowFuse rejects a call whose tool reaches past your grant, whether the grant came from signing in or from a token's scope.

Actions an agent takes appear in the [audit log](/docs/user/logs/#ai-agents-and-api-activity), attributed to your account and marked as having come from a connected agent.

## If something is not working

**A change was refused.** The agent has read-only access. Re-connect it and grant full access.

**The agent cannot reach a team.** That team was not included when you signed in. Re-connect and include it.

**The agent cannot see the instance you mean.** Flow and editor work runs in a connected editor session. Ask your agent to list your sessions and connect to the right one.

## Requirements

An instance the agent works in should run a current launcher or Device Agent and in-editor assistant. These update when an instance restarts, so a long-running instance may lag. If the agent cannot do something you expected in an instance, this is usually why.

On self-hosted, platform messaging runs over the MQTT broker, so the Team Broker must be available; what that needs from you depends on how your platform was installed, see [MQTT Broker configuration](/docs/install/configuration/#mqtt-broker-configuration). AI features also require an Enterprise licence with AI enabled.
