describe('FlowFuse - Brokers Clients', () => {
    describe('is accessible to users with correct permissions', () => {
        beforeEach(() => {
            cy.login('alice', 'aaPassword')
            cy.home()
        })

        it('users don\'t have access to the broker entry in the main menu', () => {
            cy.get('[data-nav="team-brokers"]').should('not.exist')
            cy.get('[data-nav="team-brokers"] [data-el="premium-feature"]').should('not.exist')
        })
    })

    describe('is not accessible to users with insufficient permissions', () => {
        it('should have the brokers menu entry hidden and route guard for viewer roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 10 })
            cy.login('bob', 'bbPassword')
            cy.home()

            cy.get('[data-nav="team-brokers"]').should('not.exist')
            cy.visit('team/ateam/brokers/team-broker/clients')
            cy.url().should('include', 'team/ateam/overview')
        })

        it('should have the brokers menu entry hidden and route guard for dashboard roles', () => {
            cy.login('dashboard-dave', 'ddPassword')
            cy.visit('/')

            cy.get('[data-nav="team-brokers"]').should('not.exist')
            cy.visit('team/ateam/brokers/team-broker/clients')

            cy.get('[data-el="instances-table"]').should('exist')
        })
    })
})
