---
navTitle: FlowFuse MCP
---

# FlowFuse MCP Server

FlowFuse exposes an MCP server. An AI agent connects as a client to operate the platform and build flows.

Two clients use it:

- **FlowFuse Expert**, the AI built into the platform and the Node-RED editor.
- **Your own agent**, such as Microsoft Copilot, ChatGPT or Claude, connected over the [MCP endpoint](/docs/user/expert/third-party-agents/).

Both use the same capabilities. What an agent can do depends only on the access you grant.

> **Note:** This is not the same as [MCP server nodes](https://flowfuse.com/node-red/flowfuse/mcp/), which build MCP servers inside your flows. This page is about operating FlowFuse itself, where FlowFuse is the server and your agent is the client.

## Platform Automations

Actions an agent can take on the platform, by resource and access level.

| Resource | Read-only | Full access |
|---|---|---|
| Teams | Members and roles, invitations, audit log, resource counts, bill of materials | Create a team, update settings, change member roles, invite and re-invite members |
| Applications | Applications, audit log, device groups, bill of materials | Create and update applications |
| Hosted instances | Live status, resources, configuration, logs, files, history, HTTP tokens | Create, start, stop, restart, suspend; update settings, environment and config surfaces; import flows; edit files; manage HTTP tokens |
| Remote instances | Remote instances and live status | Register and assign to an application, restart, update settings and operating mode |
| Snapshots | Snapshots, including full flows | Create, export, import, update; set an instance's device target |
| Pipelines | Pipelines and stages | Create and update pipelines; add, update and deploy stages |
| Device groups | Team and application device groups | Create and update groups, change membership and settings |
| FlowFuse Tables | Databases, tables, schemas, row data | Table data is changed through flows, see [Flow Building](#flow-building) |
| Team broker | Brokers, clients, topics, schema | Start, stop, suspend the broker agent; create and update topics |
| Your account | Profile, notifications, invitations | Update profile, mark notifications read, respond to invitations |
| Blueprints and templates | Blueprints, templates, instance and team types | Starting points for creating instances and teams |

Ask the agent what it can do in a given team or instance. Its tools reflect the access granted and the instance it is connected to.

## Flow Building

An agent builds and edits flows inside a running Node-RED instance.

Flow work runs in a live editor session, not as a file to import. Point the agent at an open editor session and it builds on the canvas. Node-RED validates as it goes, so the agent catches its own mistakes.

| Area | Read-only | Full access |
|---|---|---|
| Nodes | Read nodes with validation state | Add, update and remove nodes |
| Wiring | — | Wire nodes on a tab, link nodes across tabs |
| Tabs | List tabs | Add, rename, enable, disable and remove tabs |
| Subflows and subroutines | List subflows | Create and remove subflows, create subroutines |
| Groups | — | Create, update, move and delete groups, change their members |
| Palette | Read the installed palette, describe node type properties | Open the palette manager to install packages |
| Canvas | Read the full flow, list config nodes, read debug output, search and select nodes | Navigate to a tab or subflow, align and distribute nodes |
| FlowFuse Tables | Query table data | Build a [Query Node](/docs/user/ff-tables/#query-nodes) flow that reads and writes tables |

By default nothing goes live until you deploy from Node-RED. A team owner can let agents deploy their own changes, see [Agent deploy](#agent-deploy).

## Agent deploy

A team owner turns this on from **Team Settings > Danger > AI Flow Deploy**. It is off by default and needs AI Features enabled for the team.

## Access and permissions

Access comes at one of two levels:

- **Read-only** sees everything and changes nothing.
- **Full access** adds every action in the full-access columns above.

With **FlowFuse Expert**, an agent acts with the same access you have on the team you are working in.

With **your own agent**, you choose the access when you connect. Signing in over OAuth takes you to a FlowFuse page where you pick read-only or full access, scope it to all your teams or specific teams, and set an expiration date. A personal access token, for clients without a sign-in flow, carries the same read-only or full-access choice.
