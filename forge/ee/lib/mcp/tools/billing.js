const { teamId } = require('../schemas')

module.exports = [
    {
        name: 'platform_get_team_billing',
        title: 'Get Team Billing',
        description: `FlowFuse platform automation tool:
            Reads a team billing and subscription details, including the current plan items, price, and next billing date.
            Use this when the user asks about their team plan, subscription cost, or when the next invoice is due.
            Returns a 404-style error if the team has no active subscription, and a billing_unmanaged error if the team subscription is not managed through this platform (for example, an enterprise contract).`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/ee/billing/teams/${args.teamId}` })
            return response
        }
    },
    {
        name: 'platform_get_team_customer_portal',
        title: 'Get Team Customer Portal',
        description: `FlowFuse platform automation tool:
            Gets a URL to the team Stripe customer portal, where the user can manage their billing details, payment methods, and subscription.
            Use this when the user wants to update their payment method, view invoices, or change their subscription plan.`,
        annotations: { readOnlyHint: true, destructiveHint: false },
        inputSchema: {
            teamId
        },
        handler: async (args, { inject }) => {
            const response = await inject({ method: 'GET', url: `/ee/billing/teams/${args.teamId}/customer-portal` })
            if (response.statusCode >= 400) {
                return response
            }
            return {
                statusCode: 200,
                json: () => ({ url: response.headers.location })
            }
        }
    }
]
