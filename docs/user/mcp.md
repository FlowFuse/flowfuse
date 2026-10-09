---
navTitle: FlowFuse MCP
meta:
   description: See what an AI agent can do through the FlowFuse MCP server, from platform actions to building flows, and how the Read, Write and Destructive permissions limit it.
---

# FlowFuse MCP Server

FlowFuse exposes an MCP server. An AI agent connects as a client to operate the platform and build flows.

Two clients use it:

- **FlowFuse Expert**, the AI built into the platform and the Node-RED editor.
- **Your own agent**, such as Microsoft Copilot, ChatGPT or Claude, connected over the [MCP endpoint](/docs/user/expert/third-party-agents/).

Both use the same capabilities. What an agent can do depends only on the permissions you grant, see [Access and permissions](#access-and-permissions).

> **Note:** This is not the same as [MCP server nodes](https://flowfuse.com/docs/flowfuse-nodes/mcp/), which build MCP servers inside your flows. This page is about operating FlowFuse itself, where FlowFuse is the server and your agent is the client.

## Platform Automations

Actions an agent can take on the platform, by resource and [permission](#access-and-permissions).

| Resource | Read | Write | Destructive |
|---|---|---|---|
| Teams | Teams you belong to, members and roles, invitations, audit log, instance counts, npm packages, Git tokens, bill of materials | Create a team, update settings, invite and re-invite members | Change member roles, remove members, revoke invitations |
| Applications | Applications, audit log, snapshots, instance statuses, device groups, bill of materials | Create and update applications | Delete an application |
| Hosted instances | Instances and live status, resources, configuration, custom hostname, logs, files, history, audit log, HTTP tokens, name availability, dashboard instances, editor and overview links | Create an instance, create HTTP tokens | Start, stop, restart, suspend; update settings, environment and config surfaces; import flows; upload, edit and delete files; roll back; delete an instance; update and delete HTTP tokens |
| Remote instances | Remote instances and live status, provisioning tokens | Register an instance, assign it to an application, set the operating mode | Update settings |
| Snapshots | Snapshots, including full flows, and an instance's device target | Create, export, import, update | Delete a snapshot, set an instance's device target |
| Pipelines | Pipelines and stages | Create and update pipelines, add and update stages | Deploy a stage, delete a pipeline or stage |
| Device groups | Team and application device groups | Create a group | Update a group, change membership and settings, delete a group |
| FlowFuse Tables | Databases, tables, schemas, row data | Create a table. Row data is changed through flows, see [Flow Building](#flow-building) | None |
| Team broker | Brokers, clients, topics, schema | Create and update topics | Start, stop, suspend the broker agent; delete topics and clients |
| Search | Search team resources and instances | None | None |
| Editor sessions | List open editor sessions, see and set the active one | None | None |
| Your account | Profile, notifications, invitations | Update profile, mark notifications read | Delete notifications, accept or decline team invitations |
| Blueprints and templates | Blueprints, templates, instance and team types | None | None |

Ask the agent what it can do in a given team or instance. Its tools reflect the permissions granted and the instance it is connected to.

## Flow Building

An agent builds and edits flows inside a running Node-RED instance.

Flow work runs in a live editor session, not as a file to import. Point the agent at an open editor session and it builds on the canvas. Node-RED validates as it goes, so the agent catches its own mistakes.

| Area | Read | Write | Destructive |
|---|---|---|---|
| Nodes | Read nodes with validation state | Add and update nodes | Remove nodes |
| Wiring | None | Wire nodes on a tab, link nodes across tabs | None |
| Tabs | List tabs | Add, rename, enable and disable tabs | Remove tabs |
| Subflows and subroutines | List subflows | Create subflows and subroutines | Remove subflows |
| Groups | None | Create, update, move and delete groups, change their members | None |
| Config nodes | List config nodes | Create and update config nodes | Delete config nodes |
| Import | None | Import a flow onto the canvas | None |
| Palette | Read the installed palette, list node types, describe node type properties | Install FlowFuse and certified nodes directly, open the palette manager to install any other package, see [Node installs](#node-installs) | None |
| Canvas | Read the full flow, read debug output, search and select nodes, navigate to a tab or subflow | Align and distribute nodes, set the deploy mode | Deploy changes, see [Agent deploy](#agent-deploy) |
| FlowFuse Tables | Query table data | Build a [Query Node](/docs/user/ff-tables/#query-nodes) flow that reads and writes tables | None |

By default nothing goes live until you deploy from Node-RED. A team owner can let agents deploy their own changes, see [Agent deploy](#agent-deploy).

## Agent deploy

A team owner turns this on from **Team Settings > Danger > AI Flow Deploy**. It is off by default and needs AI Features enabled for the team.

Available from FlowFuse 3.1 with `@flowfuse/nr-assistant` 0.20.0 or later.

## Node installs

An agent installs FlowFuse-scoped plugins and certified nodes directly, without confirmation, because FlowFuse vets these packages. Which certified nodes are available depends on your license. Any other package opens the palette manager for you to confirm.

Available from FlowFuse 3.1 with `@flowfuse/nr-assistant` 0.20.0 or later.

## Access and permissions

Every tool needs one of three permissions, set separately for **Platform** tools and **Flow Building** tools:

- **Read** sees everything and changes nothing.
- **Write** adds and updates things. It includes Read.
- **Destructive** covers tools that delete or overwrite data, or change what is running. It includes Write and Read.

With **FlowFuse Expert**, an agent acts with the same access you have on the team you are working in. Expert's own approval cards are described in [Controlling what Expert can do](/docs/user/expert/chat/#controlling-what-expert-can-do).

With **your own agent**, you choose the permissions when you connect. Signing in over OAuth takes you to a FlowFuse authorization page with these steps:

1. Tick the permissions the agent gets by default, for Platform and Flow Building.
2. Choose **All teams** or **Specific teams**.
3. Optionally select **Edit** next to a team to give it its own permissions instead of the defaults. A team using its own permissions is marked **Custom**, and **Reset** returns it to the defaults.
4. Set an expiration date, up to a year.

For example, an agent can have Destructive access to Platform tools in a staging team and only Read access everywhere else.

The default permissions also apply to teams you join later when you chose **All teams**. A call that needs a permission the agent was not granted in that team is refused.

A connection appears in your token list under **User Settings > Security** with a summary of its permissions. To change them, delete the token and connect the agent again.

A personal access token, for clients without a sign-in flow, is scoped to teams and can be limited to **Read Only**, see [Scoping a Token](/docs/user/user-settings/#scoping-a-token).
