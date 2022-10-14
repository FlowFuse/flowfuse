const { Roles } = require('./roles.js')

module.exports = {
    Permissions: {
        // Platform Scoped Actions
        'platform:audit-log': { description: 'Access Team Audit Log', role: Roles.Admin },
        // Team Scoped Actions
        'team:create': { description: 'Create Team', admin: false },
        'team:edit': { description: 'Edit Team', role: Roles.Owner },
        'team:delete': { description: 'Delete Team', role: Roles.Owner },
        'team:audit-log': { description: 'Access Team Audit Log', role: Roles.Owner },
        // Team Members
        'team:user:add': { description: 'Add Members', role: Roles.Admin },
        'team:user:invite': { description: 'Invite Members', role: Roles.Owner },
        'team:user:remove': { description: 'Remove Member', role: Roles.Owner, self: true },
        'team:user:change-role': { description: 'Modify Member role', role: Roles.Owner },
        // Projects
        'project:create': { description: 'Create Project', role: Roles.Owner },
        'project:delete': { description: 'Delete Project', role: Roles.Owner },
        'project:transfer': { description: 'Transfer Project', role: Roles.Owner },
        'project:change-status': { description: 'Start/Stop Project', role: Roles.Owner },
        'project:edit': { description: 'Edit Project Settings', role: Roles.Owner },
        'project:edit-env': { description: 'Edit Project Environment Variables', role: Roles.Member },
        'project:log': { description: 'Access Project Log', role: Roles.Viewer },
        'project:audit-log': { description: 'Access Project Audit Log', role: Roles.Viewer },
        // Project Editor
        'project:flows:view': { description: 'View Project Flows', role: Roles.Viewer },
        'project:flows:edit': { description: 'Edit Project Flows', role: Roles.Member },
        'project:snapshot:create': { description: 'Create Project Snapshot', role: Roles.Member },
        'project:snapshot:delete': { description: 'Delete Project Snapshot', role: Roles.Owner },
        'project:snapshot:rollback': { description: 'Rollback Project Snapshot', role: Roles.Member },
        'project:snapshot:set-target': { description: 'Set Device Target Snapshot', role: Roles.Member },
        // Templates
        'template:create': { description: 'Create a Template', role: Roles.Admin },
        'template:delete': { description: 'Delete a Template', role: Roles.Admin },
        'template:edit': { description: 'Edit a Template', role: Roles.Admin },
        // Stacks
        'stack:create': { description: 'Create a Stack', role: Roles.Admin },
        'stack:delete': { description: 'Delete a Stack', role: Roles.Admin },
        'stack:edit': { description: 'Edit a Stack', role: Roles.Admin },
        // Devices
        'device:list': { description: 'List Devices', role: Roles.Admin },
        'device:create': { description: 'Create a Device', role: Roles.Owner },
        'device:delete': { description: 'Delete a Device', role: Roles.Owner },
        'device:edit': { description: 'Edit a Device', role: Roles.Owner },
        'device:edit-env': { description: 'Edit Device Environment Variables', role: Roles.Member },
        // Project Types
        'project-type:create': { description: 'Create a ProjectType', role: Roles.Admin },
        'project-type:delete': { description: 'Delete a ProjectType', role: Roles.Admin },
        'project-type:edit': { description: 'Edit a ProjectType', role: Roles.Admin }
    }
}
