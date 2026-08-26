---
navTitle: Connect Your Own Agent
---

# Connect Your Own Agent

FlowFuse Expert is not the only AI that can work your platform. FlowFuse also acts as an MCP
server, so the AI agent your team already uses can operate FlowFuse for you: working your
teams, applications and instances, and building and editing the flows inside your Node-RED
instances.

Because the agent is yours, so is the model behind it. Which model or model provider you use
is controlled by your agent, not by FlowFuse.

> **Note:** This is separate from
> [MCP server nodes](https://flowfuse.com/node-red/flowfuse/mcp/). Those let you build MCP
> servers inside your flows, connected to anything you like, to give any AI a set of tools of
> your own design. This page is about operating FlowFuse itself through MCP, where FlowFuse
> is the server and your agent is the client.

## Connect your agent

Any MCP client that speaks HTTP can connect. That is the only requirement.

1. **Add the FlowFuse MCP address in your agent's connector settings.** See
   [where to add it, per agent](#where-to-add-it-per-agent) if you are not sure where yours
   lives.

   On FlowFuse Cloud:

   ```
   https://app.flowfuse.com/mcp
   ```

   Self-hosted, substitute your own platform address:

   ```
   https://flowfuse.example.com/mcp
   ```

2. **Sign in.** FlowFuse uses OAuth, so your agent sends you to a FlowFuse login page to
   authenticate, in the same way as any other application you sign in to. If your client asks
   for an OAuth client ID or secret, leave them blank. FlowFuse registers your client for you.

3. **Choose what the agent may do.** As part of signing in you decide which teams the agent
   may act on, and whether it has editing rights or read access only.

Your agent can now work your platform. Signing in is the intended route. A few clients cannot
do it and take a token in a header instead, which is covered in
[connecting a client that cannot sign in](#connecting-a-client-that-cannot-sign-in).

## What your agent can do, and what you grant

This is the one place these are described. Ask your agent what it can do in a given team or
instance if you want the current picture, since its tools reflect the instance it is
connected to.

**With read access**, an agent can see your teams and applications with their activity
history, your hosted and remote instances with their live status and runtime logs, your
snapshots, and your FlowFuse Tables databases including table schemas and row data. It can
also see which instance types, templates and blueprints your team has available.

**With editing rights**, it can additionally create applications and hosted instances,
register remote instances and assign them to applications, take snapshots, and build and edit
flows.

An agent with read access has no ability to change anything.

FlowFuse Tables is read-only through the platform tools, for the time being, so an agent can
query your data to answer a question but not write to it directly. A flow is a different
route. An agent with editing rights can build a flow containing a
[Query Node](/docs/user/ff-tables/#query-nodes), and that flow writes to your tables like any
other flow you would have written yourself.

### Deleting, and deploying

Nothing an agent can do through FlowFuse deletes anything, for now. There is no tool for
deleting an instance, an application, a snapshot or a team. Deploying is also done by you,
for the same reason.

We are focused on delivering AI in a meaningful way that can act as required both in
production setups and in setups where experimentation is permitted, so expect this to develop.

## Editing flows

Asking about your platform needs nothing open. Editing flows happens in a live Node-RED
editor, so that you can see the work as it happens on the canvas rather than receiving a
result you have to go and check. Working in the running editor also means the agent gets
Node-RED's own validation back as it goes, so it catches and corrects its own mistakes rather
than handing you a flow that will not load.

When you ask for flow work, your agent will guide you to connect an editor session. In the
platform header there is a control for indicating which of your current browser sessions the
agent should work in, so if you have several open you can point it at the right one. Ending
the session, or closing the tab, ends the agent's access to your editor. Switching team also
ends it.

## Where to add it, per agent

The agents below are the common ones and where their settings live. Anything else that speaks
MCP over HTTP connects in the same way.

### Microsoft Copilot

In **Copilot Studio**, open your agent's **Tools** page, select **Add a tool**, then **New
tool**, then **Model Context Protocol**. Give the server a name and a description saying what
it is for, since the orchestrator uses that description to decide when to call it, and enter
the FlowFuse MCP address as the server URL.

To make FlowFuse available across a Microsoft 365 tenant rather than in a single agent, a
tenant administrator registers it in the Microsoft 365 admin center. Once approved it appears
in Copilot Studio for everyone.

Access through Copilot Studio runs over Power Platform connectors, so any Power Platform data
policy your organisation has also governs it.

### ChatGPT

Custom connectors live behind developer mode. A workspace administrator enables it under
**Workspace Settings**, then **Permissions & Roles**, before anyone can add one. Then add
FlowFuse as a connector with the MCP address and sign in.

### Claude

Open **Settings**, then **Customize**, then **Connectors**, add a custom connector, and enter
the FlowFuse MCP address.

On Team and Enterprise plans an owner adds the connector for the organisation first, and then
each person connects and signs in individually.

### Command-line and editor agents

Claude Code, Cursor, Visual Studio Code and Gemini CLI all connect to the same address. Where
a client offers a sign-in flow, use it. Where it does not, see
[connecting a client that cannot sign in](#connecting-a-client-that-cannot-sign-in).

For Claude Code:

```bash
claude mcp add --transport http flowfuse https://app.flowfuse.com/mcp
```

### Local and self-hosted models

Use any HTTP-capable MCP client, such as LM Studio, LibreChat or Open WebUI, pointed at your
own model, and add the FlowFuse address as a server in that client's configuration. Note that
Ollama is a model runtime rather than an agent, so it needs an MCP client in front of it.

## Connecting a client that cannot sign in

Signing in is the intended route, and the one to use wherever your client supports it. A few
clients do not: they take a token in a header instead, or their configuration file only
accepts a local command rather than an address. This is a property of the client, not of the
kind of agent, and both routes reach the same FlowFuse with the same enforcement.

Create a [Personal Access Token](/docs/user/user-settings/#personal-access-tokens) and
[scope it](/docs/user/user-settings/#scoping-a-token) the same way you would when signing in.
Scope it to the team you want the agent working in rather than to everything you can reach.

### Clients that take a header

Claude Code, Cursor and Visual Studio Code take the address and the header directly:

```json
{
  "mcpServers": {
    "flowfuse": {
      "type": "http",
      "url": "https://app.flowfuse.com/mcp",
      "headers": { "Authorization": "Bearer <your-token>" }
    }
  }
}
```

For Visual Studio Code, prompt for the token rather than committing it to the repository:

```json
{
  "servers": {
    "flowfuse": {
      "type": "http",
      "url": "https://app.flowfuse.com/mcp",
      "headers": { "Authorization": "Bearer ${input:ff_token}" }
    }
  },
  "inputs": [
    {
      "id": "ff_token",
      "type": "promptString",
      "password": true,
      "description": "FlowFuse access token"
    }
  ]
}
```

### Clients whose configuration file takes a local command

Claude Desktop is the common one. Its configuration file accepts a command to run rather than
an address to call, so the connection goes through `mcp-remote`, which talks to FlowFuse over
HTTP on the client's behalf. Add this alongside whatever the file already contains:

```json
{
  "mcpServers": {
    "flowfuse": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://app.flowfuse.com/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer <your-token>"
      }
    }
  }
}
```

The token sits in `env` and the header argument has no space in it on purpose. Some clients do
not escape spaces when they launch the command, which mangles the value if you write
`Bearer <your-token>` into `args` directly.

The file lives at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS,
and `%APPDATA%\Claude\claude_desktop_config.json` on Windows.

## Approvals and audit

FlowFuse tools carry their recommended usage and permissions, so a connected agent knows what
each one is for before it calls it. Most MCP clients then ask you to confirm before they run a
tool. That prompt belongs to the client rather than to FlowFuse, so how it looks, and whether
you can turn it off, differs between them. FlowFuse Expert's own approval cards are a
first-party feature and do not apply here.

What FlowFuse enforces on every call is what you granted: the teams, and read access or
editing rights. That is the granularity. It is a boundary around what an agent can reach
rather than a per-tool allow list, and it applies the same way whether the grant came from
signing in or from the scope on an access token.

Actions an agent takes appear in the
[audit log](/docs/user/logs/#ai-agents-and-api-activity), attributed to your account and
marked as having come from a connected agent.

## If something is not working

**A change was refused.** The agent has read access only. Re-connect it and grant editing
rights.

**The agent cannot reach a team.** That team was not included when you signed in. Re-connect
and include it.

**The agent cannot see the instance you mean.** Flow and editor work runs in a connected
editor session. Ask your agent to list your sessions and connect to the right one.

## Getting the best out of it

None of this is something to set up before you start. Your agent will tell you when
something is in the way, and can help resolve it.

For the smoothest experience, an instance the agent works in should be on a current launcher
or Device Agent, with a current in-editor assistant. These update when an instance restarts,
so a long-running instance may be behind. If an agent cannot do something you expected in a
particular instance, this is usually why, and asking the agent about it is the quickest route.

On self-hosted, platform messaging runs over the MQTT broker, so the Team Broker needs to be
available. Whether anything is needed from you depends on how your platform was installed;
see [MQTT Broker configuration](/docs/install/configuration/#mqtt-broker-configuration). AI
features also require an Enterprise licence with AI enabled.
