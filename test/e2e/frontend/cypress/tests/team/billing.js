describe('FlowForge - Team Billing', () => {
    beforeEach(() => {
        cy.enableBilling()
    })

    describe('credit balance banner', () => {
        it('is hidden when the team does not have credit', () => {
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/billing`)

                cy.get('[data-el="credit-balance-banner"]').should('not.exist')
            })
        })

        it('is visible when the team has credit', () => {
            cy.applyBillingCreditToTeam(4321)
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/billing`)
                cy.wait('@getTeamBySlug')
                cy.wait('@getTeamBilling')

                cy.get('[data-el="credit-balance-banner"]').should('exist').contains('$43.21')
                cy.get('[data-el="credit-balance-banner"]').should('exist').contains('credit')
            })
        })

        it('is visible when the team has debt', () => {
            cy.applyBillingCreditToTeam(-4321)
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/billing`)
                cy.wait('@getTeamBySlug')
                cy.wait('@getTeamBilling')

                cy.get('[data-el="credit-balance-banner"]').should('exist').contains('$43.21')
                cy.get('[data-el="credit-balance-banner"]').should('exist').contains('owe')
            })
        })
    })

    describe('Cancelled subscriptions', () => {
        it('redirects regular users to the billing page', () => {
            cy.login('bob', 'bbPassword')

            cy.intercept('GET', '/api/v1/teams/*', (req) => req.reply(res => {
                res.body = {
                    ...res.body,
                    ...{
                        billing: {
                            active: false,
                            canceled: true,
                            customer: 'cus_Q7HgF3LrYhO3r2',
                            pastDue: false,
                            subscription: 'sub_1PH36qJ6VWAujNoL8DX1oE7V',
                            unmanaged: false
                        }
                    }
                }
                return res
            })).as('getTeams')

            cy.visit('/')

            cy.wait('@getTeams')

            cy.url().should('include', '/team/ateam/billing')

            cy.get('[data-nav="team-applications"').click()
            cy.url().should('include', '/team/ateam/billing')
            cy.get('[data-nav="team-instances"').click()
            cy.url().should('include', '/team/ateam/billing')
            cy.get('[data-nav="team-devices"').click()
            cy.url().should('include', '/team/ateam/billing')
            cy.get('[data-nav="shared-library"').click()
            cy.url().should('include', '/team/ateam/billing')
            cy.get('[data-nav="team-members"').click()
            cy.url().should('include', '/team/ateam/billing')
            cy.get('[data-nav="team-audit"').click()
            cy.url().should('include', '/team/ateam/billing')
            cy.get('[data-nav="team-billing"').click()
            cy.url().should('include', '/team/ateam/billing')

            cy.get('[data-nav="team-settings"').click()
            cy.url().should('include', '/team/ateam/settings/general')
        })

        it('allows admins to navigate the team', () => {
            cy.login('alice', 'aaPassword')

            cy.intercept('GET', '/api/v1/teams/*', (req) => req.reply(res => {
                res.body = {
                    ...res.body,
                    ...{
                        billing: {
                            active: false,
                            canceled: true
                        }
                    }
                }
                return res
            })).as('getTeams')

            cy.visit('/')

            cy.wait('@getTeams')

            cy.get('[data-nav="team-applications"').click()
            cy.url().should('include', '/team/ateam/applications')
            cy.get('[data-nav="team-instances"').click()
            cy.url().should('include', '/team/ateam/instances')
            cy.get('[data-nav="team-devices"').click()
            cy.url().should('include', '/team/ateam/devices')
            cy.get('[data-nav="shared-library"').click()
            cy.url().should('include', '/team/ateam/library/')
            cy.get('[data-nav="team-members"').click()
            cy.url().should('include', '/team/ateam/members/general')
            cy.get('[data-nav="team-audit"').click()
            cy.url().should('include', '/team/ateam/audit-log')
            cy.get('[data-nav="team-billing"').click()
            cy.url().should('include', '/team/ateam/billing')
            cy.get('[data-nav="team-settings"').click()
            cy.url().should('include', '/team/ateam/settings/general')
        })
    })
})
