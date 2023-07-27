describe('FlowForge - Applications - With Billing', () => {
    beforeEach(() => {
        cy.enableBilling()
    })

    it('can create a project that will charge the user', () => {
        cy.intercept('POST', '/api/*/applications').as('createApplication')
        cy.intercept('POST', '/api/*/projects').as('createInstance')
        cy.intercept('GET', '/api/*/stacks*').as('loadStacks')

        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/applications/create`)

            cy.get('[data-action="create-project"]').should('be.disabled')

            cy.get('[data-el="charges-table"]').should('not.exist')

            cy.get('[data-form="application-name"] input').clear()
            cy.get('[data-form="application-name"] input').type(`new-application-${Math.random().toString(36).substring(2, 7)}`)
            cy.contains('type1').click()

            cy.wait('@loadStacks')
            cy.get('[data-el="charges-table"]').should('exist')

            cy.get('[data-el="selected-instance-type-name"]').contains('type1')
            cy.get('[data-el="selected-instance-type-cost"]').contains('$15.00')
            cy.get('[data-el="selected-instance-type-interval"]').contains('/mo')

            cy.get('[data-el="payable-now-summary"]').contains('$15.00 now').contains('$15.00 /month')

            cy.get('[data-action="create-project"]').should('not.be.disabled').click()
        })
    })

    it('considers any credit balance the team may have when creating a project', () => {
        cy.applyBillingCreditToTeam(1001)
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/applications/create`)

            cy.wait('@getTeamBySlug')
            cy.wait('@getTeamBilling')

            cy.get('[data-el="charges-table"]').should('not.exist')

            cy.get('[data-form="application-name"] input').clear()
            cy.get('[data-form="application-name"] input').type(`new-application-${Math.random().toString(36).substring(2, 7)}`)
            cy.contains('type1').click()

            cy.get('[data-el="charges-table"]').should('exist')

            cy.get('[data-el="credit-balance-banner"]').should('exist').contains('credit')
            cy.get('[data-el="credit-balance-banner"]').should('exist').contains('$10.01')

            cy.get('[data-el="selected-instance-type-name"]').contains('type1')
            cy.get('[data-el="selected-instance-type-cost"]').contains('$15.00')
            cy.get('[data-el="selected-instance-type-interval"]').contains('/mo')

            cy.get('[data-el="credit-balance-row"]').should('exist')
            cy.get('[data-el="credit-balance-amount"]').contains('$10.01')

            cy.get('[data-el="payable-now-summary"]').contains('$4.99')

            cy.get('[data-action="create-project"]').should('not.be.disabled').click()
        })
    })

    it('considers any debit balance the team may have when creating a project', () => {
        cy.applyBillingCreditToTeam(-1001)
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/applications/create`)

            cy.wait('@getTeamBySlug')
            cy.wait('@getTeamBilling')

            cy.get('[data-el="charges-table"]').should('not.exist')

            cy.get('[data-form="application-name"] input').clear()
            cy.get('[data-form="application-name"] input').type(`new-application-${Math.random().toString(36).substring(2, 7)}`)
            cy.contains('type1').click()

            cy.get('[data-el="charges-table"]').should('exist')

            cy.get('[data-el="credit-balance-banner"]').should('exist').contains('owe')
            cy.get('[data-el="credit-balance-banner"]').should('exist').contains('$10.01')

            cy.get('[data-el="selected-instance-type-name"]').contains('type1')
            cy.get('[data-el="selected-instance-type-cost"]').contains('$15.00')
            cy.get('[data-el="selected-instance-type-interval"]').contains('/mo')

            cy.get('[data-el="credit-balance-row"]').should('exist')
            cy.get('[data-el="credit-balance-amount"]').contains('$10.01')

            cy.get('[data-el="payable-now-summary"]').contains('$25.01')

            cy.get('[data-action="create-project"]').should('not.be.disabled').click()
        })
    })
})
