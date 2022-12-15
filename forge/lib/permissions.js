const { Roles } = require('./roles.js')
const Permissions = {
    // User Actions
    'user:read': { description: 'View user Information', self: true },
    'user:edit': { description: 'Edit User Information', self: true },
    // Team Scoped Actions
    'team:create': { description: 'Create Team' },
    'team:read': { description: 'View a Team', role: Roles.Viewer },
    'team:edit': { description: 'Edit Team', role: Roles.Owner },
    'team:delete': { description: 'Delete Team', role: Roles.Owner },
    'team:audit-log': { description: 'Access Team Audit Log', role: Roles.Owner },
    // Team Members
    'team:user:add': { description: 'Add Members', role: Roles.Admin },
    'team:user:list': { description: 'List Team Members', role: Roles.Viewer },
    'team:user:invite': { description: 'Invite Members', role: Roles.Owner },
    'team:user:remove': { description: 'Remove Member', role: Roles.Owner, self: true },
    'team:user:change-role': { description: 'Modify Member role', role: Roles.Owner },
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
    // Snapshots
    'project:snapshot:create': { description: 'Create Project Snapshot', role: Roles.Member },
    'project:snapshot:list': { description: 'List Project Snapshots', role: Roles.Viewer },
    'project:snapshot:read': { description: 'View a Project Snapshot', role: Roles.Viewer },
    'project:snapshot:delete': { description: 'Delete Project Snapshot', role: Roles.Owner },
    'project:snapshot:rollback': { description: 'Rollback Project Snapshot', role: Roles.Member },
    'project:snapshot:set-target': { description: 'Set Device Target Snapshot', role: Roles.Member },
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
    'device:read': { description: 'View a Device', role: Roles.Viewer },
    'device:delete': { description: 'Delete a Device', role: Roles.Owner },
    'device:edit': { description: 'Edit a Device', role: Roles.Owner },
    'device:edit-env': { description: 'Edit Device Environment Variables', role: Roles.Member },
    // Project Types
    'project-type:create': { description: 'Create a ProjectType', role: Roles.Admin },
    'project-type:list': { description: 'List all ProjectTypes' },
    'project-type:read': { description: 'View a ProjectType' },
    'project-type:delete': { description: 'Delete a ProjectType', role: Roles.Admin },
    'project-type:edit': { description: 'Edit a ProjectType', role: Roles.Admin }
}

module.exports = {
    Permissions,
    registerPermissions: function (newPermisssions) {
        Object.keys(newPermisssions).forEach(key => {
            Permissions[key] = newPermisssions[key]
        })
    }
}
