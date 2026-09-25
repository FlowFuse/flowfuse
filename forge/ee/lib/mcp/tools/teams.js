const { z } = require('zod')

const { teamId, applicationId, basePagination, basePaginationKeys, searchQuery, searchQueryKeys, auditLogFilters, auditLogFilterKeys, appendQuery, toolError } = require('../schemas')

// Audit-log routes accept cursor+limit pagination, free-text query, event
// (single name or array) and username. scope narrows which entity levels are
// returned; includeChildren pulls in descendant entries within the chosen scope.
const includeChildren = z.boolean().optional().describe('Also include audit entries from child entities within the chosen scope')

// Mirrors validStates in the /:teamId/instance-counts preHandler (forge/routes/api/team.js).
// The route 400s on anything outside this list, so publishing it as an enum is the only way a
// caller can discover the vocabulary - and it is deliberately NOT the high-level state groups
// that platform_list_hosted_instances accepts. Keep the two in step.
const INSTANCE_STATES = ['starting', 'stopping', 'restarting', 'suspending', 'rollback', 'importing',
    'error', 'crashed', 'stopped', 'suspended', 'warning', 'connected', 'info', 'success', 'pushing', 'pulling',
    'loading', 'installing', 'safe', 'protected', 'running', '']
const auditLogInput = { ...basePagination, ...searchQuery, ...auditLogFilters }
const auditLogKeys = [...basePaginationKeys, ...searchQueryKeys, ...auditLogFilterKeys]

module.exports = [
    {
        name: 'platform_list_teams',
        title: 'List Teams',
        description: 'FlowFuse platform automation tool: List all teams the authenticated user belongs to. Returns team names, slugs, IDs, and membership roles.',
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {},
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: '/api/v1/user/teams' })
            return response
        }
    },
    {
        name: 'platform_get_team',
        title: 'Get Team',
        description: `FlowFuse platform automation tool:
            Get details of a specific team, identified by either its hashid (teamId) or its URL slug (teamSlug). Provide exactly one of the two.
            Includes team type, member count, and hosted and remote instance counts.
            The embedded team type carries a long description field holding the raw HTML used to render the plan's
            feature list in the UI. It is presentation markup, not data: ignore it, and read plan limits from
            type.properties instead.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId: teamId.optional().describe('Team hashid. Provide either teamId or teamSlug, not both.'),
            teamSlug: z.string().regex(/^[a-z0-9-_]+$/i).optional().describe('Team slug (URL identifier; lowercase letters, digits, hyphen and underscore). Provide either teamId or teamSlug, not both.')
        },
        handler: async (args, { inject }) => {
            const hasId = !!args.teamId
            const hasSlug = !!args.teamSlug
            if (hasId === hasSlug) {
                return toolError(400, 'invalid_request', 'Provide exactly one of teamId or teamSlug')
            }
            const url = hasId
                ? `/api/v1/teams/${args.teamId}`
                : `/api/v1/teams/slug/${args.teamSlug}`
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_team_instance_counts',
        title: 'Get Team Instance Counts',
        description: `FlowFuse platform automation tool:
            Counts a team's instances of the given type, optionally narrowed by state and application.
            instanceType is required: use "hosted" for hosted instances or "remote" for remote instances (devices).
            Use this for quick totals instead of listing and counting every instance yourself.
            Note that state here takes raw runtime states, NOT the high-level groups platform_list_hosted_instances
            uses. "running", "error" and "notRunning" are group names understood only by that tool; passing them here
            is rejected. Use the individual states from this tool's own enum instead.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            instanceType: z.enum(['remote', 'hosted']).describe('Instance type to count'),
            state: z.array(z.enum(INSTANCE_STATES)).optional().describe('Optional list of raw instance states to filter the counts by (defaults to all). These are individual runtime states, not the "running"/"error"/"notRunning" groups used by platform_list_hosted_instances.'),
            applicationId: applicationId.optional().describe('Application hashid to scope the counts to a single application')
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/instance-counts`, args, ['instanceType', 'state', 'applicationId'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_get_team_membership',
        title: 'Get Team Membership',
        description: `FlowFuse platform automation tool:
            Gets the authenticated user's own membership (role) in a team.
            Use this to check what role the current user holds in a team before attempting an action that needs a specific role.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/user` })
            return response
        }
    },
    {
        name: 'platform_list_team_members',
        title: 'List Team Members',
        description: `FlowFuse platform automation tool:
            Lists the members of a team, including their role and, when SSO is enabled, whether their membership is SSO-managed.
            Use this to see who belongs to a team before inviting, removing, or changing the role of a member.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/members` })
            return response
        }
    },
    {
        name: 'platform_list_team_invitations',
        title: 'List Team Invitations',
        description: `FlowFuse platform automation tool:
            Lists the pending invitations for a team.
            This requires the Owner role, so a non-Owner credential will get an access error even though this tool itself is read-only.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/invitations` })
            return response
        }
    },
    {
        name: 'platform_get_team_audit_log',
        title: 'Get Team Audit Log',
        description: `FlowFuse platform automation tool:
            Reads the audit log for a team. By default it returns only team-level events (membership changes,
            billing changes, and other team administrative actions). To also include events from the team's
            applications, instances, and devices, set includeChildren or set scope to that entity level.
            A team-scoped PAT only sees audit log entries for teams it is scoped to.
            Use this when the user asks what happened on a team, or wants to investigate recent changes.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            ...auditLogInput,
            scope: z.enum(['team', 'application', 'project', 'device']).optional().describe('Entity level to include (default team)'),
            includeChildren
        },
        handler: async (args, { inject }) => {
            const url = appendQuery(`/api/v1/teams/${args.teamId}/audit-log`, args, [...auditLogKeys, 'scope', 'includeChildren'])
            const response = await inject({ method: 'GET', url })
            return response
        }
    },
    {
        name: 'platform_list_team_npm_packages',
        title: 'List Team NPM Packages',
        description: `FlowFuse platform automation tool:
            Lists the private npm packages owned by a team.
            The npm registry is a plan-gated feature; if it is not enabled for the team's plan, or the team does not exist, the underlying API's error response is returned as-is.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/npm/packages` })
            return response
        }
    },
    {
        name: 'platform_list_team_git_tokens',
        title: 'List Team Git Tokens',
        description: `FlowFuse platform automation tool:
            Lists the git tokens configured for a team. The response never includes the raw stored personal access token, only its ID, name, and type.
            Git integration is a plan-gated feature; if it is not enabled for the team's plan, or the team does not exist, the underlying API's error response is returned as-is.`,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/api/v1/teams/${args.teamId}/git/tokens` })
            return response
        }
    },
    {
        name: 'platform_create_team',
        title: 'Create Team',
        description: `FlowFuse platform automation tool:
            Creates a new team. The calling user becomes the team's owner.
            type is the hashid of a team type (tier/plan); call platform_list_team_types to find one. An unknown or inactive type is rejected with "invalid_team_type".
            slug is optional: when omitted, one is generated from the name. Slugs may only contain letters, digits, hyphen and underscore, must be unique across the platform, and "create" is reserved.
            Non-admin users can only create teams when the platform allows self-service team creation; otherwise the call fails as unauthorized.
            On platforms with billing, the response may include a billingURL - a checkout link the user must visit to activate the team's subscription. Surface that link to the user. trial requests trial-mode setup and is only honoured for brand-new users (no other teams, account under a week old) on team types with trials enabled; otherwise it is rejected.
            When the calling credential is a team-scoped token, the new team falls outside that scope: the call still succeeds, but follow-up calls against the team (reading it, updating it, inviting to it) return an access error and it will not appear in platform_list_teams.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            name: z.string().describe('Display name for the new team'),
            type: z.string().describe('The hashid of the team type (tier/plan) for the team, as returned by platform_list_team_types'),
            slug: z.string().regex(/^[a-z0-9-_]+$/i).optional().describe('URL identifier for the team: letters, digits, hyphen and underscore, unique across the platform ("create" is reserved). Generated from the name when omitted'),
            trial: z.boolean().optional().describe('Request trial-mode setup. Only honoured when billing is active, the team type has trials enabled, and the user is brand new; rejected otherwise'),
            billingInterval: z.enum(['month', 'year']).optional().describe('Billing cycle for the subscription checkout session, on platforms with billing')
        },
        handler: async (args, { inject }) => {
            const payload = { name: args.name, type: args.type }
            for (const key of ['slug', 'trial', 'billingInterval']) {
                if (args[key] !== undefined) {
                    payload[key] = args[key]
                }
            }
            const response = await inject({ method: 'POST', url: '/api/v1/teams', payload })
            return response
        }
    },
    {
        name: 'platform_update_team',
        title: 'Update Team',
        description: `FlowFuse platform automation tool:
            Renames a team and/or changes its slug. Only the fields you pass are changed; omitted (or empty) fields keep their stored value. Pass at least one of name or slug.
            Changing the slug changes the team's URLs. Slugs may only contain letters, digits, hyphen and underscore, must be unique, and "create" is reserved - conflicts are rejected with a 400.
            Team type, suspension, feature toggles and properties are deliberately not editable through this tool.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            name: z.string().min(1).optional().describe('New display name for the team'),
            slug: z.string().regex(/^[a-z0-9-_]+$/i).optional().describe('New URL identifier for the team: letters, digits, hyphen and underscore, unique across the platform ("create" is reserved). Changing it changes the team URLs')
        },
        handler: async (args, { inject }) => {
            const payload = {}
            if (args.name !== undefined) {
                payload.name = args.name
            }
            if (args.slug !== undefined) {
                payload.slug = args.slug
            }
            // The route replies 200 with the unchanged team when there is nothing
            // to update, which reads as a successful edit that never happened.
            if (Object.keys(payload).length === 0) {
                return toolError(400, 'invalid_request', 'Pass at least one of name or slug to update')
            }
            const response = await inject({ method: 'PUT', url: `/api/v1/teams/${args.teamId}`, payload })
            return response
        }
    },
    {
        name: 'platform_change_member_role',
        title: 'Change Team Member Role',
        description: `FlowFuse platform automation tool:
            Changes an existing team member's role. Roles are numeric: 5=Dashboard, 10=Viewer, 30=Member, 50=Owner.
            CAUTION: demoting a team's only owner is blocked when the new role is Member, but NOT when it is Viewer or Dashboard. Those succeed and leave the team with no owner at all, after which nobody but a platform admin can restore one, delete the team, or invite anyone to it. Check platform_list_team_members for how many owners a team has before demoting one, and confirm with the user first.
            Members whose team membership is managed through SSO cannot be changed here; that fails with "Cannot modify team membership for an SSO managed user".
            Other disallowed changes come back as a generic 403 "invalid_request" without detail - the usual causes are the user not being a member of the team, or demoting the only owner to Member. Check membership with platform_list_team_members first when unsure.
            Setting the role the member already has succeeds as a no-op.`,
        // destructiveHint: a single call can permanently orphan a team (see the
        // CAUTION above), which is less recoverable than anything else here, so it
        // belongs behind destructive tool access rather than plain write.
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            userId: z.string().describe('The hashid of the team member whose role is changing'),
            role: z.union([z.literal(5), z.literal(10), z.literal(30), z.literal(50)]).describe('New team role: 5=Dashboard, 10=Viewer, 30=Member, 50=Owner')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'PUT', url: `/api/v1/teams/${args.teamId}/members/${args.userId}`, payload: { role: args.role } })
            return response
        }
    },
    {
        name: 'platform_invite_team_member',
        title: 'Invite Team Member',
        description: `FlowFuse platform automation tool:
            Invites people to join a team, by username (existing platform users) or email address. The role is granted when the invitation is accepted; it defaults to 30=Member.
            Up to 5 people can be invited per call (after de-duplication); more returns a 429 "too_many_invites".
            Read both the status and the body. A fully successful call returns { status: "okay" }. Per-person failures (unknown user, already a member, already invited, email restrictions) come back as HTTP 200 with code "invitation_failed" and error as an object mapping each failed entry to its reason - treat those entries as NOT invited. A call rejected outright, for example because the team's user limit is reached, comes back as HTTP 400, also with code "invitation_failed", but error is a plain string and nobody was invited.
            The route is also rate limited to 5 calls per 30 seconds, which is a second, different 429: "too_many_invites" means more than 5 invitees in one call and retrying unchanged will never work, while a rate-limit 429 clears on its own after a few seconds.
            Email invitations to people without an account depend on the platform allowing external invitations and having email configured.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        inputSchema: {
            teamId,
            user: z.string().describe('Comma-separated list of usernames and/or email addresses to invite (maximum 5 per call after de-duplication)'),
            role: z.union([z.literal(5), z.literal(10), z.literal(30), z.literal(50)]).optional().describe('Team role granted on acceptance: 5=Dashboard, 10=Viewer, 30=Member, 50=Owner. Defaults to 30=Member')
        },
        handler: async (args, { inject }) => {
            const payload = { user: args.user }
            if (args.role !== undefined) {
                payload.role = args.role
            }
            const response = await inject({ method: 'POST', url: `/api/v1/teams/${args.teamId}/invitations`, payload })
            return response
        }
    },
    {
        name: 'platform_resend_team_invitation',
        title: 'Resend Team Invitation',
        description: `FlowFuse platform automation tool:
            Resends a pending team invitation email and extends the invitation's expiry date. Use platform_list_team_invitations to find the invitation id.
            Returns 404 when the invitation does not exist or belongs to a different team. Resends are rate-limited on platforms with rate limits enabled.`,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        inputSchema: {
            teamId,
            invitationId: z.string().describe('The hashid of the invitation to resend, as returned by platform_list_team_invitations')
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'POST', url: `/api/v1/teams/${args.teamId}/invitations/${args.invitationId}` })
            return response
        }
    }
]
