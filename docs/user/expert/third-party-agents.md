---
navTitle: Connect Your Own Agent
---

# Connect Your Own Agent

FlowFuse Expert is not the only AI that can work your platform. FlowFuse also acts as an
MCP server, so the AI agent your team already uses can query your teams and instances,
and build Node-RED applications for you.

This page covers connecting that agent, deciding what to let it do, and getting flow
building working. If your company only permits an approved AI assistant, this is how that
assistant reaches FlowFuse.

> **Note:** This is the opposite direction to
> [MCP server nodes](/node-red/flowfuse/mcp/), which let you build an MCP server *inside*
> a flow for an agent to call. Here, FlowFuse *is* the server and your agent is the client.

## Before you start

Connecting takes a minute. Getting the agent to build flows depends on the instance you
point it at, so it is worth checking these first.

| What is needed | On FlowFuse Cloud | Self-hosted |
| --- | --- | --- |
| The platform MQTT broker and Team Broker | Already configured | You configure both |
| A current launcher on the instance, or Device Agent 4.x on a remote instance | Your instance | Your instance |
| A current version of the in-editor assistant on that instance | Your instance | Your instance |

The first row is all you need to query the platform. **Building or editing flows needs all
three.**

On self-hosted, see
[MQTT Broker configuration](/docs/install/configuration/#mqtt-broker-configuration). AI
features also require an Enterprise licence and `ai.enabled`.

### Check the instance before you ask for a flow

The in-editor assistant only updates when an instance restarts. A long-running instance can
be on an older version, which means your agent will connect and answer questions about the
platform but fail to build anything. This is the most common thing to get caught by.

To check: open the Application, select the **Dependencies** tab, and search for
`nr-assistant`. If the version looks old, or you are unsure, restart the instance before
you start. A restart is enough; you do not need to recreate anything.

## Connect the agent

The steps are the same whichever agent you use. Only the location of the settings changes.

1. **Copy the FlowFuse MCP address.**

   On FlowFuse Cloud:

   ```
   https://app.flowfuse.com/api/v1/mcp
   ```

   Self-hosted, substitute your own platform address:

   ```
   https://flowfuse.example.com/api/v1/mcp
   ```

2. **Add it in your agent's connector settings.** See
   [where to add it, per agent](#where-to-add-it-per-agent) below if you are not sure where
   yours lives.

3. **Sign in to FlowFuse.** Your agent opens a normal FlowFuse sign-in. There is no key to
   generate and nothing to paste.

4. **Choose what the agent may reach.** Signing in asks which teams the agent can act on,
   and whether it may make changes or only read. See
   [deciding what to grant](#deciding-what-to-grant).

Your agent can now work the platform. To let it build flows as well, continue to
[open an editor session for it](#open-an-editor-session-for-it).

## Deciding what to grant

Two questions, asked when you sign in.

**Which teams.** Grant the teams the agent has a reason to touch, not all of them. If you
have a production team and a development team, granting only development means a mistaken
instruction cannot reach production, whatever you ask for.

**Read only, or changes as well.** Read-only is worth starting with if you mainly want to
ask questions about running instances, check logs, or query your FlowFuse Tables data.
FlowFuse refuses any change from a read-only grant before it reaches an instance, so this
holds even if the agent tries.

Grant changes when you want the agent to create applications and instances, register remote
instances, take snapshots, or build flows.

### Changing your mind later

Re-connect the agent and sign in again with the scopes you want. There is no separate
screen for editing what an existing connection may do.

### What a change can and cannot be

Nothing an agent can do through FlowFuse deletes anything. There is no tool for deleting an
instance, an application, a snapshot or a team, so a granted agent cannot remove your work
no matter how it is instructed.

Deploying is also yours. An agent can build and edit flows, and you deploy them.

## Open an editor session for it

Asking about the platform needs nothing open. Building or editing flows runs against a
Node-RED editor you have deliberately exposed, so you can watch the work happen on the
canvas.

1. Open the instance you want the agent to work in.
2. In the page header, next to the FlowFuse Expert button, select the **MCP** toggle.
3. Ask your agent to build something. It targets that session.

Select the toggle again to end the exposure. Closing the tab also ends it, and switching
team closes the session too.

If you have several tabs exposed at once, your agent can list them and pin the one it should
work in, so you can tell it which instance you mean.

## What your agent can do

**On the platform**, an agent can read your teams and applications with their activity
history, your hosted and remote instances with live status and runtime logs, your snapshots,
and your FlowFuse Tables databases including table schemas and row data. It can also see
which instance types, templates and blueprints your team has available.

With changes granted, it can create an application, create a hosted instance, register a
remote instance and assign it to an application, and take a snapshot of a hosted or remote
instance. FlowFuse Tables stays read-only: an agent can query your data and cannot write to
it.

**In the Node-RED editor**, an agent creates and edits flows and nodes on the canvas, reads
debug output back, and corrects its own node configuration when Node-RED rejects it. The
tools carry Node-RED's type schemas and return its validation errors, so the agent can see
what it got wrong and fix it rather than guessing.

Editor capability is read from the connected instance when your agent connects, so exactly
what is available depends on that instance rather than on your FlowFuse version. Ask your
agent what it can do in a given instance rather than working from a fixed list.

## Where to add it, per agent

### Microsoft Copilot

In **Copilot Studio**, open your agent's **Tools** page, select **Add a tool**, then **New
tool**, then **Model Context Protocol**. Give the server a name and a description that says
what it is for, since the orchestrator uses that description to decide when to call it, and
enter the FlowFuse MCP address as the server URL.

To make FlowFuse available across a Microsoft 365 tenant rather than in a single agent, a
tenant administrator registers it in the Microsoft 365 admin center. Once approved it
appears in Copilot Studio for everyone.

Access through Copilot Studio runs over Power Platform connectors, so any Power Platform
data policy your organisation has also governs it.

### ChatGPT

Custom connectors live behind developer mode. A workspace administrator enables it under
**Workspace Settings**, then **Permissions & Roles**, before anyone can add one. Then add
FlowFuse as a connector with the MCP address and sign in.

### Claude

Open **Settings**, then **Customize**, then **Connectors**, add a custom connector, and
enter the FlowFuse MCP address.

On Team and Enterprise plans an owner adds the connector for the organisation first, and
then each person connects and signs in individually.

### Command-line and editor agents

Claude Code, Cursor, Visual Studio Code and Gemini CLI all connect to the same address.
Where a client offers a sign-in flow, use it. Where a client only accepts a header, use
[an access token](#authenticating-with-an-access-token) instead.

For Claude Code:

```bash
claude mcp add --transport http flowfuse https://app.flowfuse.com/api/v1/mcp
```

### Local and self-hosted models

Use any MCP-capable client, such as LM Studio, LibreChat or Open WebUI, pointed at your own
model, and add the FlowFuse address as a server in that client's configuration. Note that
Ollama is a model runtime rather than an agent, so it needs an MCP-capable client in front of
it.

## Authenticating with an access token

Some clients authenticate with a token in a header rather than signing in. This is a
property of the client, not of the kind of agent: both routes reach the same FlowFuse.

Create a [Personal Access Token](/docs/user/user-settings/#personal-access-tokens) and
[scope it](/docs/user/user-settings/#scoping-a-token) to the teams the agent should reach.
Set it read-only unless the agent needs to make changes, since tokens are read-write by
default. Then send it as a bearer token.

In a `.mcp.json` or equivalent client configuration:

```json
{
  "mcpServers": {
    "flowfuse": {
      "type": "http",
      "url": "https://app.flowfuse.com/api/v1/mcp",
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
      "url": "https://app.flowfuse.com/api/v1/mcp",
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

### From a model provider API

If you are calling a model API directly rather than using an agent application, pass
FlowFuse as a remote MCP server. The provider connects to FlowFuse itself, so the address
has to be reachable from the internet: a local development platform will not work.

Anthropic Messages API:

```python
client.beta.messages.create(
    model="claude-opus-5",
    max_tokens=4096,
    betas=["mcp-client-2025-11-20"],
    mcp_servers=[{
        "type": "url",
        "name": "flowfuse",
        "url": "https://app.flowfuse.com/api/v1/mcp",
        "authorization_token": "<your-token>",
    }],
    tools=[{"type": "mcp_toolset", "mcp_server_name": "flowfuse"}],
    messages=[{"role": "user", "content": "List my FlowFuse instances"}],
)
```

Both `mcp_servers` and the matching `mcp_toolset` entry are required.

OpenAI Responses API:

```python
client.responses.create(
    model="gpt-5",
    tools=[{
        "type": "mcp",
        "server_label": "flowfuse",
        "server_url": "https://app.flowfuse.com/api/v1/mcp",
        "authorization": "<your-token>",
    }],
    input="List my FlowFuse instances",
)
```

## Approvals, and who is asking

FlowFuse marks every tool it offers as either read-only or as making a change, so a
connected agent knows before it acts. What the agent does with that is the agent's own
behaviour: some ask you to confirm a change, some do not, and it varies between them.

This differs from FlowFuse Expert, which holds every write behind an approval card of its
own. A connected third-party agent does not use those approval cards.

What does not vary is the scope you granted. FlowFuse enforces it on every call, so a
read-only grant is refused whatever the agent decides to try.

Actions an agent takes appear in the
[audit log](/docs/user/logs/#ai-agents-and-api-activity), attributed to your account.

## Troubleshooting

**The agent connected but cannot build a flow.** The instance is almost certainly on an
older in-editor assistant. Check the Application's **Dependencies** tab for `nr-assistant`
and restart the instance. See
[check the instance before you ask for a flow](#check-the-instance-before-you-ask-for-a-flow).

**The agent cannot see the instance I mean.** Flow and editor work needs an exposed editor
session. Open the instance and select the **MCP** toggle in the page header. If several are
exposed, ask your agent to list the sessions and pin the right one.

**A change was refused.** The grant is read-only. Re-connect the agent and sign in again,
granting changes.

**The agent cannot reach a team.** That team was not included when you signed in.
Re-connect and include it.

**Nothing works on self-hosted.** Check the platform MQTT broker and Team Broker are both
configured, and that the platform has an Enterprise licence with AI enabled.
