const { z } = require('zod')

const { teamId, toolError } = require('../schemas')

const isHashid = (id) => /^[A-Za-z0-9]+$/.test(id)

module.exports = [
    {
        name: 'platform_create_library_entry',
        title: 'Create Team Library Entry',
        description: `FlowFuse platform automation tool:
            Saves an entry in a team's shared library, the library the team's Node-RED instances and devices share in the editor's import and export dialogs.
            An entry is identified by its path and type. If an entry with the same path and type already exists, its body and meta are replaced and the call still succeeds, so repeating a call is safe but silently overwrites. The same path can hold separate entries of different types.
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
            if (!isHashid(args.teamId)) {
                return toolError(400, 'invalid_request', 'teamId must be a hashid')
            }
            const segments = args.path.split('/')
            if (segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
                return toolError(400, 'invalid_request', 'path must not start or end with "/" or contain empty, "." or ".." segments')
            }
            if (args.type === 'flows' && typeof args.body === 'string') {
                try {
                    JSON.parse(args.body)
                } catch (err) {
                    return toolError(400, 'invalid_request', 'The body of a "flows" entry must be valid JSON: an array of nodes or a JSON string of one')
                }
            }
            const payload = { type: args.type, body: args.body }
            if (args.meta !== undefined) {
                payload.meta = args.meta
            }
            const url = `/storage/library/${args.teamId}/${segments.map(encodeURIComponent).join('/')}`
            const response = await inject({ method: 'POST', url, payload })
            if (response.statusCode === 404) {
                return toolError(404, 'not_found', 'The shared library is not enabled for this team, or the team does not exist, or you are not a member of it')
            }
            if (response.statusCode >= 400) {
                return response
            }
            return {
                statusCode: response.statusCode,
                json: () => ({ entry: { path: args.path, type: args.type } })
            }
        }
    }
]
