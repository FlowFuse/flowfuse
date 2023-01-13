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

                cy.visit(`/team/${team.slug}/biling`)

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

                cy.get('[data-el="credit-balance-banner"]').should('exist').contains('$43.21')
            })
        })
    })
})
