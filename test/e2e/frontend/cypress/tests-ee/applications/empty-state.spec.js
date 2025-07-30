describe('FlowFuse - Application - Empty State', () => {
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
        cy.visit('team/bteam/applications')
    })

    it('is shown when a user navigates to the Applications view and has no applications', () => {
        cy.get('[data-el="empty-state"]').should('exist')
    })
})
