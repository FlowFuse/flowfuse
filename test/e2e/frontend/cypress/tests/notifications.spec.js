describe('FlowForge - Notifications', () => {
    describe('Team Invitations', () => {
        describe('appear as notification messages', () => {
            it('to users that have no team memberships', () => {
                cy.login('dave', 'ddPassword')

                cy.intercept('/api/*/user').as('getUser')
                cy.intercept('/api/*/settings').as('getSettings')
                cy.intercept('/api/*/user/teams').as('getTeams')
                cy.intercept('/api/*/user/invitations').as('getInvitations')

                cy.intercept('/api/*/admin/stats').as('getAdminStats')
                cy.intercept('/api/*/admin/license').as('getAdminLicense')

                cy.visit('/')

                cy.wait('@getUser')
                cy.wait('@getSettings')
                cy.wait('@getTeams')
                cy.wait('@getInvitations')

                cy.get('[data-el="right-drawer"').should('not.be.visible')

                cy.get('[data-el="notifications-button"')
                    .should('exist')
                    .contains(2)

                cy.get('[data-el="notifications-button"').click()

                cy.get('[data-el="right-drawer"').should('be.visible')

                cy.get('[data-el="right-drawer"').within(() => {
                    cy.get('[data-el="notifications-drawer"]')

                    cy.get('[data-el="invitation-message"]').should('have.length', 2)
                    cy.get('[data-el="invitation-message"]').contains('Team Invitation')
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by Alice Skywalker to join ATeam.')
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by Bob Solo to join BTeam.')

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation').click()

                    cy.url().should('include', 'account/teams/invitations')
                })
            })
        })
    })
})
