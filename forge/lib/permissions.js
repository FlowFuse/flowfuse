const { Roles } = require('./roles.js')
const Permissions = {
    // User Actions
    'user:create': { description: 'Create User', role: Roles.Admin },
    'user:list': { description: 'List platform users', role: Roles.Admin },
    'user:read': { description: 'View user Information', role: Roles.Admin, self: true },
    'user:edit': { description: 'Edit User Information', role: Roles.Admin, self: true },
    'user:delete': { description: 'Delete User', role: Roles.Admin, self: true },
    'user:team:list': { description: 'List a Users teams', role: Roles.Admin, self: true },
    // Team Scoped Actions
    'team:create': { description: 'Create Team' },
    'team:list': { description: 'List Teams', role: Roles.Admin },
    'team:read': { description: 'View a Team', role: Roles.Dashboard },
    'team:edit': { description: 'Edit Team', role: Roles.Owner },
    'team:delete': { description: 'Delete Team', role: Roles.Owner },
    'team:audit-log': { description: 'Access Team Audit Log', role: Roles.Owner },
    // Team Auto Device Provisioning Tokens
    'team:device:provisioning-token:create': { description: 'Create a Team Auto Device Provisioning Token', role: Roles.Owner },
    'team:device:provisioning-token:edit': { description: 'Edit a Team Auto Device Provisioning Token', role: Roles.Owner },
    'team:device:provisioning-token:list': { description: 'List Team Auto Device Provisioning Tokens', role: Roles.Owner },
    'team:device:provisioning-token:delete': { description: 'Delete a Team Auto Device Provisioning Token', role: Roles.Owner },
    // Team Members
    'team:user:add': { description: 'Add Members', role: Roles.Admin },
    'team:user:list': { description: 'List Team Members', role: Roles.Viewer },
    'team:user:invite': { description: 'Invite Members', role: Roles.Owner },
    'team:user:remove': { description: 'Remove Member', role: Roles.Owner, self: true },
    'team:user:change-role': { description: 'Modify Member role', role: Roles.Owner },
    // Applications
    'application:audit-log': { description: 'Access Application Audit Log', role: Roles.Owner },
    // Projects
    'team:projects:list': { description: 'List Team Projects', role: Roles.Viewer },
    'project:create': { description: 'Create Project', role: Roles.Owner },
    'project:delete': { description: 'Delete Project', role: Roles.Owner },
    'project:read': { description: 'View a Project', role: Roles.Viewer },
    'project:transfer': { description: 'Transfer Project', role: Roles.Owner },
    'project:change-status': { description: 'Start/Stop Project', role: Roles.Owner },
    'project:edit': { description: 'Edit Project Settings', role: Roles.Owner },
    'project:edit-env': { description: 'Edit Project Environment Variables', role: Roles.Member },
    'project:log': { description: 'Access Project Log', role: Roles.Viewer },
    'project:audit-log': { description: 'Access Project Audit Log', role: Roles.Viewer },
    // Project Editor
    'project:flows:view': { description: 'View Project Flows', role: Roles.Viewer },
    'project:flows:edit': { description: 'Edit Project Flows', role: Roles.Member },
    'project:flows:http': { description: 'Access http endpoints of an Instance', role: Roles.Dashboard },
    // Snapshots
    'project:snapshot:create': { description: 'Create Project Snapshot', role: Roles.Member },
    'project:snapshot:list': { description: 'List Project Snapshots', role: Roles.Viewer },
    'project:snapshot:read': { description: 'View a Project Snapshot', role: Roles.Viewer },
    'project:snapshot:delete': { description: 'Delete Project Snapshot', role: Roles.Owner },
    'project:snapshot:rollback': { description: 'Rollback Project Snapshot', role: Roles.Member },
    'project:snapshot:set-target': { description: 'Set Device Target Snapshot', role: Roles.Member },
    'project:snapshot:export': { description: 'Export Project Snapshot', role: Roles.Owner },
    // Templates
    'template:create': { description: 'Create a Template', role: Roles.Admin },
    'template:list': { description: 'List all Templates' },
    'template:read': { description: 'View a Template' },
    'template:delete': { description: 'Delete a Template', role: Roles.Admin },
    'template:edit': { description: 'Edit a Template', role: Roles.Admin },
    // Stacks
    'stack:create': { description: 'Create a Stack', role: Roles.Admin },
    'stack:list': { description: 'List all Stacks' },
    'stack:read': { description: 'View a Stack' },
    'stack:delete': { description: 'Delete a Stack', role: Roles.Admin },
    'stack:edit': { description: 'Edit a Stack', role: Roles.Admin },
    // Devices
    'team:device:list': { description: 'List Team Devices', role: Roles.Viewer },
    'device:list': { description: 'List Devices', role: Roles.Admin },
    'device:create': { description: 'Create a Device', role: Roles.Owner },
    'device:provision': { description: 'Provision a Device', role: null },
    'device:read': { description: 'View a Device', role: Roles.Viewer },
    'device:delete': { description: 'Delete a Device', role: Roles.Owner },
    'device:edit': { description: 'Edit a Device', role: Roles.Owner },
    'device:edit-env': { description: 'Edit Device Environment Variables', role: Roles.Member },
    'device:change-status': { description: 'Start/Stop a Device', role: Roles.Owner },
    'device:snapshot:create': { description: 'Create Device Snapshot', role: Roles.Member },
    'device:snapshot:list': { description: 'List Device Snapshots', role: Roles.Viewer },
    'device:snapshot:read': { description: 'View a Device Snapshot', role: Roles.Viewer },
    'device:snapshot:delete': { description: 'Delete Device Snapshot', role: Roles.Owner },
    'device:snapshot:set-target': { description: 'Set Device Target Snapshot', role: Roles.Member },
    'device:audit-log': { description: 'View a Device Audit Log', role: Roles.Viewer },

    // Project Types
    'project-type:create': { description: 'Create a ProjectType', role: Roles.Admin },
    'project-type:list': { description: 'List all ProjectTypes' },
    'project-type:read': { description: 'View a ProjectType' },
    'project-type:delete': { description: 'Delete a ProjectType', role: Roles.Admin },
    'project-type:edit': { description: 'Edit a ProjectType', role: Roles.Admin },

    // Team Types
    'team-type:create': { description: 'Create a TeamType', role: Roles.Admin },
    'team-type:list': { description: 'List all TeamTypes' },
    'team-type:read': { description: 'View a TeamType' },
    'team-type:delete': { description: 'Delete a TeamType', role: Roles.Admin },
    'team-type:edit': { description: 'Edit a TeamType', role: Roles.Admin },

    'settings:edit': { description: 'Edit platform settings', role: Roles.Admin },
    'license:read': { description: 'View license information', role: Roles.Admin },
    'license:edit': { description: 'Edit license information', role: Roles.Admin },

    'invitation:list': { description: 'List all invitations', role: Roles.Admin },

    'platform:debug': { description: 'View platform debug information', role: Roles.Admin },
    'platform:stats': { description: 'View platform stats information', role: Roles.Admin },
    'platform:stats:token': { description: 'Create/Delete platform stats token', role: Roles.Admin },
    'platform:audit-log': { description: 'View platform audit log', role: Roles.Admin }
}

module.exports = {
    Permissions,
    registerPermissions: function (newPermisssions) {
        Object.keys(newPermisssions).forEach(key => {
            Permissions[key] = newPermisssions[key]
        })
    }
}
