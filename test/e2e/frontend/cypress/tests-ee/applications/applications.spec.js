describe('FlowFuse - Applications - With Billing', () => {
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

            cy.get('[data-el="next-step"]').should('be.disabled')

            cy.get('[data-el="charges-table"]').should('not.exist')

            cy.get('[data-form="application-name"] input').clear()
            cy.get('[data-form="application-name"] input').type(`new-application-${Math.random().toString(36).substring(2, 7)}`)

            cy.get('[data-el="next-step"]').should('be.enabled')
            cy.get('[data-el="next-step"]').click()

            cy.wait('@loadStacks')

            cy.contains('type1').click()

            cy.get('[data-el="charges-table"]').should('exist')

            cy.contains('template1').click()

            cy.get('[data-el="credit-balance-banner"]').should('not.exist')

            cy.get('[data-el="selected-instance-type-name"]').contains('type1')

            cy.get('[data-el="selected-instance-type-cost"]').contains('$15.00')
            cy.get('[data-el="selected-instance-type-interval"]').contains('/mo')

            cy.get('[data-el="payable-now-summary"]').contains('$15.00 now').contains('$15.00 /month')

            cy.get('[data-el="node-red-listbox"]').click()
            cy.get('[data-option].ff-option').first().click()

            cy.get('[data-el="next-step"]').should('not.be.disabled').click()
            cy.get('[data-el="next-step"]').should('not.be.disabled').click()

            cy.url().should('include', '/applications/')
        })
    })

    it('considers any credit balance the team may have when creating a project', () => {
        cy.applyBillingCreditToTeam(1001)
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/applications/create`)

            cy.get('[data-form="application-name"] input').clear()
            cy.get('[data-form="application-name"] input').type(`new-application-${Math.random().toString(36).substring(2, 7)}`)

            cy.get('[data-el="next-step"]').should('not.be.disabled')
            cy.get('[data-el="next-step"]').click()

            cy.wait('@getTeamBySlug')
            cy.wait('@getTeamBilling')

            cy.get('[data-el="charges-table"]').should('not.exist')

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

            cy.contains('template1').click()

            cy.get('[data-el="node-red-listbox"]').click()
            cy.get('[data-option].ff-option').first().click()

            cy.get('[data-el="next-step"]').click()

            cy.get('[data-el="next-step"]').should('exist')
            cy.get('[data-el="next-step"]').contains('Create Application')
        })
    })

    it('considers any debit balance the team may have when creating a project', () => {
        cy.applyBillingCreditToTeam(-1001)
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/applications/create`)

            cy.get('[data-form="application-name"] input').clear()
            cy.get('[data-form="application-name"] input').type(`new-application-${Math.random().toString(36).substring(2, 7)}`)

            cy.get('[data-el="next-step"]').click()

            cy.wait('@getTeamBySlug')
            cy.wait('@getTeamBilling')

            cy.get('[data-el="charges-table"]').should('not.exist')

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

            cy.contains('template1').click()

            cy.get('[data-el="node-red-listbox"]').click()
            cy.get('[data-option].ff-option').first().click()

            cy.get('[data-el="next-step"]').click()

            cy.get('[data-el="next-step"]').should('exist')
            cy.get('[data-el="next-step"]').contains('Create Application')
        })
    })

    it('shows a list of cloud hosted instances', () => {
        cy.login('bob', 'bbPassword')
        cy.home()

        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === 'BTeam'
                )

                return cy.request('GET', `/api/v1/teams/${team.id}/applications?includeApplicationSummary=true`)
            })
            .then((applicationResponse) => {
                cy.visit('/team/bteam/applications')

                cy.get('[data-el="applications-list"]').find('> li').should('have.length', 1)

                cy.get('[data-el="applications-list"] > li').first().within(() => {
                    cy.contains('application-2')

                    cy.get('[data-el="application-summary"] [data-nav="application-instances"]').contains(applicationResponse.body.applications[0].instanceCount)
                    cy.get('[data-el="application-summary"] [data-nav="application-devices"]').contains(applicationResponse.body.applications[0].deviceCount)
                    cy.get('[data-el="application-summary"] [data-nav="application-device-groups"]').contains(applicationResponse.body.applications[0].deviceGroupCount)
                    cy.get('[data-el="application-summary"] [data-nav="application-pipelines"]').contains(applicationResponse.body.applications[0].pipelineCount)
                    cy.get('[data-el="application-summary"] [data-nav="application-snapshots"]').contains(applicationResponse.body.applications[0].snapshotCount)

                    cy.get('[data-el="application-instances"]').should('exist')
                    cy.get('[data-el="application-instances"] [data-state="running"]').should('exist')
                    cy.get('[data-el="application-instances"] [data-state="running"]').contains('2')

                    cy.get('[data-el="application-instances"] [data-state="error"]').should('exist')
                    cy.get('[data-el="application-instances"] [data-state="error"]').contains('0')

                    cy.get('[data-el="application-instances"] [data-state="stopped"]').should('exist')
                    cy.get('[data-el="application-instances"] [data-state="stopped"]').contains('0')

                    cy.get('[data-el="application-devices"] [data-state="running"]').should('exist')
                    cy.get('[data-el="application-devices"] [data-state="running"]').contains('0')

                    cy.get('[data-el="application-devices"] [data-state="error"]').should('exist')
                    cy.get('[data-el="application-devices"] [data-state="error"]').contains('0')

                    cy.get('[data-el="application-devices"] [data-state="stopped"]').should('exist')
                    cy.get('[data-el="application-devices"] [data-state="stopped"]').contains('3')

                    cy.get('[data-el="application-devices"]').should('exist')
                })
            })
    })
})
