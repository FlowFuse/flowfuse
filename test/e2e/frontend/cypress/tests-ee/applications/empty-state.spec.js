describe('FlowForge - Application - Empty State', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.intercept('GET', '/api/v1/teams/*/applications*', (req) => {
            // stub an empty state response
            req.reply({
                count: 0,
                applications: []
            })
        }).as('getTeamApplications')
        cy.intercept('GET', '/api/v1/teams/*/applications/status*', (req) => {
            // stub an empty state response
            req.reply({
                count: 0,
                applications: []
            })
        }).as('getTeamApplicationsStatus')
        cy.home()
    })

    it('is shown when a user navigates to the Applications view and has no applications', () => {
        cy.get('[data-el="empty-state"]').should('exist')
    })

    it('is shown when a user navigates to the Applications view and has no applications', () => {
        cy.visit('/team/ateam/applications?billing_session=BILLING_SESSION')
        cy.get('[data-el="notification-alert"]').should('exist')
        cy.get('[data-el="notification-alert"]').contains('Thanks for signing up to FlowFuse!')
    })
})
