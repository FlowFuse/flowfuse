describe('FlowForge - Brokers Hierarchy', () => {
    describe('is not accessible to users with insufficient permissions', () => {
        it('should have the brokers menu entry hidden and route guard for viewer roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 10 })
            cy.login('bob', 'bbPassword')
            cy.home()

            cy.get('[data-nav="team-broker"]').should('not.exist')
            cy.visit('team/ateam/brokers/team-broker/hierarchy')
            cy.url().should('include', 'team/ateam/home')
        })

        it('should have the brokers menu entry hidden and route guard for dashboard roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 5 }).as('getTeamRole')
            cy.login('bob', 'bbPassword')
            cy.visit('/')

            cy.get('[data-nav="team-unified-namespace"]').should('not.exist')
            cy.visit('team/ateam/brokers/team-broker/hierarchy')
            cy.contains('There are no dashboards in this team.')
        })
    })
})
