const { z } = require('zod')

const { teamId, toolError } = require('../schemas')

module.exports = [
    {
        name: 'platform_create_library_entry',
        title: 'Create Team Library Entry',
        description: `FlowFuse platform automation tool:
            Saves an entry in a team's shared library, the library the team's Node-RED instances and devices share in the editor's import and export dialogs.
            An entry is identified by its path and type. If an entry with the same path and type already exists, its body is replaced, and its meta too when meta is given, and the call still succeeds, so repeating a call is safe but silently overwrites. The same path can hold separate entries of different types.
            Folders are implicit: they exist while an entry sits below them, so saving "utils/helpers/retry" creates the folders "utils" and "utils/helpers". A path cannot be both an entry and a folder; saving one that clashes with the other fails with 400.
            The shared library is a plan-gated feature. A 404 means it is not enabled for the team's plan, the team does not exist, or the caller is not a member of it.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            path: z.string().min(1).max(1024).describe('Entry path using "/" to separate folders, for example "utils/retry". No leading or trailing slash, and no empty, "." or ".." segments'),
            type: z.string().min(1).describe('Entry type. "flows" holds a flow and "functions" holds the code of a function node; nodes can register other types'),
            body: z.union([z.string(), z.array(z.any()), z.record(z.string(), z.any())]).describe('Entry contents. For "flows", the flow as an array of nodes or a JSON string of one. For "functions", the code as a string. Other values are stored as JSON text'),
            meta: z.record(z.string(), z.any()).optional().describe('Metadata shown when the entry is listed, for example { "description": "..." }')
        },
        outputSchema: {
            entry: z.object({
                path: z.string(),
                type: z.string()
            })
        },
        handler: async (args, { inject }) => {
            const segments = args.path.split('/')
            // The URL resolves "." and ".." segments, even encoded ones, before the route sees the name
            if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
                return toolError(400, 'invalid_request', 'path must not start or end with "/" or contain empty, "." or ".." segments')
            }
            const payload = { type: args.type, body: args.body }
            if (args.meta !== undefined) {
                payload.meta = args.meta
            }
            const url = `/storage/library/${args.teamId}/${segments.map(encodeURIComponent).join('/')}`
            const response = await inject({ method: 'POST', url, payload })
            if (response.statusCode >= 400) {
                return response
            }
            return {
                statusCode: response.statusCode,
                json: () => ({ entry: { path: args.path, type: args.type } })
            }
        }
    },
    {
        name: 'platform_delete_library_entry',
        title: 'Delete Library Entry',
        description: `FlowFuse platform automation tool:
            Permanently deletes an entry from a team's shared library, or a whole folder of entries. This cannot be undone and the content cannot be recovered.
            If an entry has exactly this path, only that entry is deleted. Otherwise the path is treated as a folder and EVERY entry beneath it, at any depth, is deleted; list the folder first and confirm the exact entries with the user.
            CAUTION: flows and snippets that other members of the team load from the library are gone for everyone. Confirm with the user before calling this, naming the entry or the folder.
            Entries of different types can share a path. Pass type to delete only the entry of that type; without it one of the entries at that path is deleted, and which one is not defined. A folder delete without type covers all types.
            Replies { status: "okay", deleteCount } with the number of entries removed. A path that matches nothing returns 404. Repeating a folder delete also removes anything added under the folder since the first call. A 404 can also mean the shared library is not enabled for the team, the team does not exist, or the caller is not a member of it.`,
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            teamId: teamId.describe('The hashid of the team that owns the shared library'),
            path: z.string().min(1).max(1024).describe('Path of the entry or folder using "/" to separate folders, for example "utils/retry". No leading or trailing slash, and no empty, "." or ".." segments'),
            type: z.string().min(1).optional().describe('Entry type to restrict the delete to, for example "flows" or "functions"')
        },
        handler: async (args, { inject }) => {
            const segments = args.path.split('/')
            // The URL resolves "." and ".." segments, even encoded ones, before the route sees the path
            if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
                return toolError(400, 'invalid_request', 'path must not start or end with "/" or contain empty, "." or ".." segments')
            }
            let url = `/storage/library/${args.teamId}/${segments.map(encodeURIComponent).join('/')}`
            if (args.type) {
                url += `?type=${encodeURIComponent(args.type)}`
            }
            return inject({ method: 'DELETE', url })
        }
    }
]
