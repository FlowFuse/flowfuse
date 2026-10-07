const { z } = require('zod')

const { teamId, toolError } = require('../schemas')

const isHashid = (id) => /^[A-Za-z0-9]+$/.test(id)

module.exports = [
    {
        name: 'platform_delete_library_entry',
        title: 'Delete Library Entry',
        description: `FlowFuse platform automation tool:
            Permanently deletes an entry from a team's shared library, or a whole folder of entries. This cannot be undone and the content cannot be recovered.
            If an entry has exactly this path, only that entry is deleted. Otherwise the path is treated as a folder and EVERY entry beneath it, at any depth, is deleted. In a folder path, "_" and "%" match any character(s) rather than themselves, so such a path can delete entries in similarly named folders; list the folder first and confirm the exact entries with the user.
            CAUTION: flows and snippets that other members of the team load from the library are gone for everyone. Confirm with the user before calling this, naming the entry or the folder.
            Entries of different types can share a path. Pass type to delete only the entry of that type; without it one of the entries at that path is deleted, and which one is not defined. A folder delete without type covers all types.
            Replies { status: "okay", deleteCount } with the number of entries removed. A path that matches nothing returns 404, so repeating a call is harmless; the 404 is the same when the shared library is not enabled for the team, the team does not exist, or the caller is not a member of it.`,
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamId.describe('The hashid of the team that owns the shared library'),
            path: z.string().min(1).max(1024).describe('Path of the entry or folder using "/" to separate folders, for example "utils/retry". No leading or trailing slash, and no empty, "." or ".." segments'),
            type: z.string().min(1).optional().describe('Entry type to restrict the delete to, for example "flows" or "functions"')
        },
        handler: async (args, { inject }) => {
            if (!isHashid(args.teamId)) {
                return toolError(400, 'invalid_request', 'teamId must be a hashid')
            }
            const segments = args.path.split('/')
            if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
                return toolError(400, 'invalid_request', 'path must not start or end with "/" or contain empty, "." or ".." segments')
            }
            let url = `/storage/library/${args.teamId}/${segments.map(encodeURIComponent).join('/')}`
            if (args.type) {
                url += `?type=${encodeURIComponent(args.type)}`
            }
            const response = await inject({ method: 'DELETE', url })
            if (response.statusCode === 404) {
                return toolError(404, 'not_found', 'Nothing was deleted. No entry or folder matches that path, or the shared library is not enabled for this team, or the team does not exist, or you are not a member of it')
            }
            return response
        }
    }
]
