const { Roles } = require('./roles.js')
const Permissions = {
    /**
     * OS Permissions
     */
    // User Actions
    'user:create': { description: 'Create User', role: Roles.Admin, access: 'write' },
    'user:list': { description: 'List platform users', role: Roles.Admin, access: 'read' },
    'user:read': { description: 'View user Information', role: Roles.Admin, self: true, access: 'read' },
    'user:edit': { description: 'Edit User Information', role: Roles.Admin, self: true, access: 'write' },
    'user:delete': { description: 'Delete User', role: Roles.Admin, self: true, access: 'write' },
    'user:team:list': { description: 'List a Users teams', role: Roles.Admin, self: true, access: 'read' },
    'user:announcements:manage': { description: 'Manage platform wide announcements', role: Roles.Admin, access: 'write' },
    // Team Scoped Actions
    'team:create': { description: 'Create Team', access: 'write' },
    'team:list': { description: 'List Teams', role: Roles.Admin, access: 'read' },
    'team:read': { description: 'View a Team', role: Roles.Dashboard, access: 'read' },
    'team:edit': { description: 'Edit Team', role: Roles.Owner, access: 'write' },
    'team:delete': { description: 'Delete Team', role: Roles.Owner, access: 'write' },
    'team:audit-log': { description: 'Access Team Audit Log', role: Roles.Owner, access: 'read' },
    'team:device:bulk-delete': { description: 'Delete Devices', role: Roles.Owner, access: 'write' },
    'team:device:bulk-edit': { description: 'Edit Devices', role: Roles.Owner, access: 'write' },
    // Team Auto Device Provisioning Tokens
    'team:device:provisioning-token:create': { description: 'Create a Team Auto Device Provisioning Token', role: Roles.Owner, access: 'write' },
    'team:device:provisioning-token:edit': { description: 'Edit a Team Auto Device Provisioning Token', role: Roles.Owner, access: 'write' },
    'team:device:provisioning-token:list': { description: 'List Team Auto Device Provisioning Tokens', role: Roles.Owner, access: 'read' },
    'team:device:provisioning-token:delete': { description: 'Delete a Team Auto Device Provisioning Token', role: Roles.Owner, access: 'write' },
    // Team Members
    'team:user:add': { description: 'Add Members', role: Roles.Admin, access: 'write' },
    'team:user:list': { description: 'List Team Members', role: Roles.Viewer, access: 'read' },
    'team:user:invite': { description: 'Invite Members', role: Roles.Owner, access: 'write' },
    'team:user:remove': { description: 'Remove Member', role: Roles.Owner, self: true, access: 'write' },
    'team:user:change-role': { description: 'Modify Member role', role: Roles.Owner, access: 'write' },

    'team:search': { description: 'Search a Teams resources', role: Roles.Viewer, access: 'read' },

    // Applications
    'application:audit-log': { description: 'Access Application Audit Log', role: Roles.Owner, access: 'read' },
    'application:access-control': { description: 'Update Application-level RBAC rules', role: Roles.Owner, access: 'write' },

    // Projects
    'team:projects:list': { description: 'List Team Projects', role: Roles.Viewer, access: 'read' },
    'team:projects:list-dashboards': { description: 'List Team Projects', role: Roles.Dashboard, access: 'read' },
    'project:create': { description: 'Create Project', role: Roles.Owner, access: 'write' },
    'project:delete': { description: 'Delete Project', role: Roles.Owner, access: 'write' },
    'project:read': { description: 'View a Project', role: Roles.Viewer, access: 'read' },
    'project:status': { description: 'View a Project', role: Roles.Dashboard, access: 'read' },
    'project:transfer': { description: 'Transfer Project', role: Roles.Owner, access: 'write' },
    'project:change-status': { description: 'Start/Stop Project', role: Roles.Owner, access: 'write' },
    'project:edit': { description: 'Edit Project Settings', role: Roles.Owner, access: 'write' },
    'project:edit-env': { description: 'Edit Project Environment Variables', role: Roles.Member, access: 'write' },
    'project:log': { description: 'Access Project Log', role: Roles.Viewer, access: 'read' },
    'project:audit-log': { description: 'Access Project Audit Log', role: Roles.Viewer, access: 'read' },
    // Project Editor
    'project:flows:view': { description: 'View Project Flows', role: Roles.Viewer, access: 'read' },
    'project:flows:edit': { description: 'Edit Project Flows', role: Roles.Member, access: 'write' },
    'project:flows:http': { description: 'Access http endpoints of an Instance', role: Roles.Dashboard, access: 'read' },
    // Snapshots
    'project:snapshot:create': { description: 'Create Project Snapshot', role: Roles.Member, access: 'write' },
    'project:snapshot:list': { description: 'List Project Snapshots', role: Roles.Viewer, access: 'read' },
    'project:snapshot:read': { description: 'View a Project Snapshot', role: Roles.Viewer, access: 'read' },
    'project:snapshot:delete': { description: 'Delete Project Snapshot', role: Roles.Owner, access: 'write' },
    'project:snapshot:rollback': { description: 'Rollback Project Snapshot', role: Roles.Member, access: 'write' },
    'project:snapshot:set-target': { description: 'Set Device Target Snapshot', role: Roles.Member, access: 'write' },
    'project:snapshot:export': { description: 'Export Project Snapshot', role: Roles.Member, access: 'write' },
    // Templates
    'template:create': { description: 'Create a Template', role: Roles.Admin, access: 'write' },
    'template:list': { description: 'List all Templates', access: 'read' },
    'template:read': { description: 'View a Template', access: 'read' },
    'template:delete': { description: 'Delete a Template', role: Roles.Admin, access: 'write' },
    'template:edit': { description: 'Edit a Template', role: Roles.Admin, access: 'write' },
    // Stacks
    'stack:create': { description: 'Create a Stack', role: Roles.Admin, access: 'write' },
    'stack:list': { description: 'List all Stacks', access: 'read' },
    'stack:read': { description: 'View a Stack', access: 'read' },
    'stack:delete': { description: 'Delete a Stack', role: Roles.Admin, access: 'write' },
    'stack:edit': { description: 'Edit a Stack', role: Roles.Admin, access: 'write' },
    // Devices
    'team:device:list': { description: 'List Team Devices', role: Roles.Viewer, access: 'read' },
    'device:list': { description: 'List Devices', role: Roles.Admin, access: 'read' },
    'device:create': { description: 'Create a Device', role: Roles.Owner, access: 'write' },
    'device:provision': { description: 'Provision a Device', role: null, access: 'write' },
    'device:read': { description: 'View a Device', role: Roles.Viewer, access: 'read' },
    'device:delete': { description: 'Delete a Device', role: Roles.Owner, access: 'write' },
    'device:edit': { description: 'Edit a Device', role: Roles.Owner, access: 'write' },
    'device:edit-env': { description: 'Edit Device Environment Variables', role: Roles.Member, access: 'write' },
    'device:change-status': { description: 'Start/Stop a Device', role: Roles.Owner, access: 'write' },
    'device:snapshot:create': { description: 'Create Device Snapshot', role: Roles.Member, access: 'write' },
    'device:snapshot:list': { description: 'List Device Snapshots', role: Roles.Viewer, access: 'read' },
    'device:snapshot:read': { description: 'View a Device Snapshot', role: Roles.Viewer, access: 'read' },
    'device:snapshot:delete': { description: 'Delete Device Snapshot', role: Roles.Owner, access: 'write' },
    'device:snapshot:set-target': { description: 'Set Device Target Snapshot', role: Roles.Member, access: 'write' },
    'device:audit-log': { description: 'View a Device Audit Log', role: Roles.Viewer, access: 'read' },

    // Snapshots (common)
    'snapshot:meta': { description: 'View a Snapshot', role: Roles.Viewer, access: 'read' },
    'snapshot:full': { description: 'View full snapshot details excluding credentials', role: Roles.Member, access: 'read' },
    'snapshot:export': { description: 'Export a snapshot including credentials', role: Roles.Member, access: 'write' },
    'snapshot:edit': { description: 'Edit a Snapshot', role: Roles.Owner, access: 'write' },
    'snapshot:delete': { description: 'Delete a Snapshot', role: Roles.Owner, access: 'write' },
    'snapshot:import': { description: 'Import a Snapshot', role: Roles.Owner, access: 'write' },

    // Project Types
    'project-type:create': { description: 'Create a ProjectType', role: Roles.Admin, access: 'write' },
    'project-type:list': { description: 'List all ProjectTypes', access: 'read' },
    'project-type:read': { description: 'View a ProjectType', access: 'read' },
    'project-type:delete': { description: 'Delete a ProjectType', role: Roles.Admin, access: 'write' },
    'project-type:edit': { description: 'Edit a ProjectType', role: Roles.Admin, access: 'write' },

    // Team Types
    'team-type:create': { description: 'Create a TeamType', role: Roles.Admin, access: 'write' },
    'team-type:list': { description: 'List all TeamTypes', access: 'read' },
    'team-type:read': { description: 'View a TeamType', access: 'read' },
    'team-type:delete': { description: 'Delete a TeamType', role: Roles.Admin, access: 'write' },
    'team-type:edit': { description: 'Edit a TeamType', role: Roles.Admin, access: 'write' },

    'settings:edit': { description: 'Edit platform settings', role: Roles.Admin, access: 'write' },
    'license:read': { description: 'View license information', role: Roles.Admin, access: 'read' },
    'license:edit': { description: 'Edit license information', role: Roles.Admin, access: 'write' },

    'invitation:list': { description: 'List all invitations', role: Roles.Admin, access: 'read' },

    'platform:debug': { description: 'View platform debug information', role: Roles.Admin, access: 'read' },
    'platform:stats': { description: 'View platform stats information', role: Roles.Admin, access: 'read' },
    'platform:stats:token': { description: 'Create/Delete platform stats token', role: Roles.Admin, access: 'write' },
    'platform:expert-agent:creds': { description: 'Create/Delete expert agent credentials', role: Roles.Admin, access: 'write' },
    'platform:audit-log': { description: 'View platform audit log', role: Roles.Admin, access: 'read' },

    /**
     * EE Permissions
     */

    // Projects
    'project:history': { description: 'View Hosted Instances project history', role: Roles.Viewer, access: 'read' },

    // Application
    'application:bom': { description: 'Get the Application Bill of Materials', role: Roles.Owner, access: 'read' },

    // Team
    'team:bom': { description: 'Get the Team Bill of Materials', role: Roles.Owner, access: 'read' },
    'team:device-group:list': { description: 'List Team device groups', role: Roles.Member, access: 'read' },

    // Device Groups
    'application:device-group:create': { description: 'Create a device group', role: Roles.Owner, access: 'write' },
    'application:device-group:list': { description: 'List device groups', role: Roles.Member, access: 'read' },
    'application:device-group:update': { description: 'Update a device group', role: Roles.Owner, access: 'write' },
    'application:device-group:delete': { description: 'Delete a device group', role: Roles.Owner, access: 'write' },
    'application:device-group:read': { description: 'View a device group', role: Roles.Member, access: 'read' },
    'application:device-group:membership:update': { description: 'Update a device group membership', role: Roles.Owner, access: 'write' },

    // Device Editor
    'device:editor': { description: 'Access the Device Editor', role: Roles.Member, access: 'write' },

    // Team Billing
    'team:billing:manual': { description: 'Setups up manual billing on a team', role: Roles.Admin, access: 'write' },
    'team:billing:trial': { description: 'Modify team trial settings', role: Roles.Admin, access: 'write' },

    // Flow Blueprints
    'flow-blueprint:create': { description: 'Create a Flow Blueprint', role: Roles.Admin, access: 'write' },
    'flow-blueprint:list': { description: 'List all Flow Blueprints', access: 'read' },
    'flow-blueprint:read': { description: 'View a Flow Blueprint', access: 'read' },
    'flow-blueprint:delete': { description: 'Delete a Flow Blueprint', role: Roles.Admin, access: 'write' },
    'flow-blueprint:edit': { description: 'Edit a Flow Blueprint', role: Roles.Admin, access: 'write' },

    // Library
    'library:entry:create': { description: 'Create entries in a team library', role: Roles.Member, access: 'write' },
    'library:entry:list': { description: 'List entries in a team library', role: Roles.Member, access: 'read' },
    'library:entry:delete': { description: 'Delete an entry in a team library', role: Roles.Member, access: 'write' },

    // Pipeline
    'pipeline:read': { description: 'View a pipeline', role: Roles.Member, access: 'read' },
    'pipeline:create': { description: 'Create a pipeline', role: Roles.Owner, access: 'write' },
    'pipeline:edit': { description: 'Edit a pipeline', role: Roles.Owner, access: 'write' },
    'pipeline:delete': { description: 'Delete a pipeline', role: Roles.Owner, access: 'write' },
    'application:pipeline:list': { description: 'List pipelines within an application', role: Roles.Member, access: 'read' },
    'team:pipeline:list': { description: 'List pipelines within a team', role: Roles.Member, access: 'read' },

    // SAML
    'saml-provider:create': { description: 'Create a SAML Provider', role: Roles.Admin, access: 'write' },
    'saml-provider:list': { description: 'List all SAML Providers', role: Roles.Admin, access: 'read' },
    'saml-provider:read': { description: 'View a SAML Provider', role: Roles.Admin, access: 'read' },
    'saml-provider:delete': { description: 'Delete a SAML Provider', role: Roles.Admin, access: 'write' },
    'saml-provider:edit': { description: 'Edit a SAML Provider', role: Roles.Admin, access: 'write' },

    // Static Assets
    'project:files:list': { description: 'List files under a project', role: Roles.Member, access: 'read' },
    'project:files:create': { description: 'Upload files to a project', role: Roles.Member, access: 'write' },
    'project:files:edit': { description: 'Modify files in a project', role: Roles.Member, access: 'write' },
    'project:files:delete': { description: 'Delete files in a project', role: Roles.Member, access: 'write' },

    // Team Broker
    'broker:clients:list': { description: 'List Team Broker clients', role: Roles.Member, access: 'read' },
    'broker:clients:create': { description: 'Create Team Broker clients', role: Roles.Owner, access: 'write' },
    'broker:clients:link': { description: 'Link Team Broker clients', role: Roles.Owner, access: 'write' },
    'broker:clients:edit': { description: 'Edit Team Broker clients', role: Roles.Owner, access: 'write' },
    'broker:clients:delete': { description: 'Delete Team Broker clients', role: Roles.Owner, access: 'write' },
    'broker:topics:list': { description: 'List active Team Broker topics', role: Roles.Member, access: 'read' },
    'broker:topics:write': { description: 'Edit Topic metadata', role: Roles.Owner, access: 'write' },

    // 3rd Party Broker
    'broker:credentials:list': { description: 'List 3rd Party Broker credentials', role: Roles.Owner, access: 'read' },
    'broker:credentials:create': { description: 'Create new Broker credentials', role: Roles.Owner, access: 'write' },
    'broker:credentials:edit': { description: 'Edit Broker Credentials', role: Roles.Owner, access: 'write' },
    'broker:credentials:delete': { description: 'Delete Broker Credentials', role: Roles.Owner, access: 'write' },

    // Team Packages
    'team:packages:read': { description: 'List Teams Private Packages', role: Roles.Member, access: 'read' },
    'team:packages:manage': { description: 'Manage Teams Private Packages', role: Roles.Owner, access: 'write' },

    // Team Git Tokens
    'team:git:tokens:list': { description: 'List Teams Git Tokens', role: Roles.Owner, access: 'read' },
    'team:git:tokens:create': { description: 'List Teams Git Tokens', role: Roles.Owner, access: 'write' },
    'team:git:tokens:edit': { description: 'Edit Teams Git Tokens', role: Roles.Owner, access: 'write' },
    'team:git:tokens:delete': { description: 'Edit Teams Git Tokens', role: Roles.Owner, access: 'write' },

    // Team Tables
    'team:database:create': { description: 'Create a new database for the team', role: Roles.Owner, access: 'write' },
    'team:database:delete': { description: 'Delete the team database', role: Roles.Owner, access: 'write' },
    'team:database:list': { description: 'List the team databases', role: Roles.Member, access: 'read' },

    // MCP
    'team:mcp:list': { description: 'List the team MCP endpoints', role: Roles.Member, access: 'read' },

    'assistant:call': { description: 'Call the Assistant service', access: 'write' },

    // FF Expert
    // MCP RBACs
    'expert:insights:mcp:allow': { description: 'Can use the MCP', role: Roles.Viewer, access: 'read' },
    'expert:insights:mcp:prompt:allow': { description: 'Can use MCP Prompts', role: Roles.Viewer, access: 'read' }, // FUTURE - ff expert MCP prompts not yet implemented
    'expert:insights:mcp:resource:allow': { description: 'Can use MCP Resources', role: Roles.Viewer, access: 'read' },
    'expert:insights:mcp:resourcetemplate:allow': { description: 'Can use MCP Resource Templates', role: Roles.Viewer, access: 'read' },
    'expert:insights:mcp:tool:allow': { description: 'Can use readonly MCP Tools', role: Roles.Viewer, access: 'read' }, // By default, viewer can use readonly tools,non-destructive, non-open-world tools
    'expert:insights:mcp:tool:write': { description: 'Can use readonly MCP Tools', role: Roles.Member, access: 'write' }, // readonly=false: implies it may modify data (though not necessarily destructive)
    'expert:insights:mcp:tool:destructive': { description: 'Can use destructive MCP Tools', role: Roles.Owner, access: 'write' }, // destructive true implies it may perform destructive actions
    'expert:insights:mcp:tool:open-world': { description: 'Can use open-world MCP Tools', role: Roles.Member, access: 'write' }, // open-world true implies it interacts with external entities
    'expert:insights:mcp:tool:non-idempotent': { description: 'Can use non-idempotent MCP Tools', role: Roles.Member, access: 'write' } // non-idempotent true implies it can NOT be safely called multiple times without side-effects. Only matters if readonly is false or destructive is true
}

module.exports = {
    Permissions
}
