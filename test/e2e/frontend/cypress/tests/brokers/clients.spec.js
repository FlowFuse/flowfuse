describe('FlowForge - Brokers Clients', () => {
    describe('is accessible to users with correct permissions', () => {
        beforeEach(() => {
            cy.login('alice', 'aaPassword')
            cy.home()
        })

        it('users don\'t have access to the broker entry in the main menu', () => {
            cy.get('[data-nav="team-brokers"]').should('not.exist')
            cy.get('[data-nav="team-brokers"] [data-el="premium-feature"]').should('not.exist')
        })

        // it('should display the upgrade banner when accessing the broker with the not available logo', () => {
        //     cy.get('[data-nav="team-brokers"]').click()
        //     cy.get('[data-el="page-banner-feature-unavailable"]').should('exist')
        //     cy.contains('Broker Not Available')
        //     cy.contains('The MQTT Broker page offers a streamlined interface for managing your broker instance and defining client connections.')
        // })
    })

    describe('is not accessible to users with insufficient permissions', () => {
        it('should have the brokers menu entry hidden and route guard for viewer roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 10 })
            cy.login('bob', 'bbPassword')
            cy.home()

            cy.get('[data-nav="team-brokers"]').should('not.exist')
            cy.visit('team/ateam/brokers/team-broker/clients')
            cy.url().should('include', 'team/ateam/applications')
        })

        it('should have the brokers menu entry hidden and route guard for dashboard roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 5 }).as('getTeamRole')
            cy.login('bob', 'bbPassword')
            cy.visit('/')

            cy.get('[data-nav="team-brokers"]').should('not.exist')
            cy.visit('team/ateam/brokers/team-broker/clients')
            cy.contains('There are no dashboards in this team.')
        })
    })
})
