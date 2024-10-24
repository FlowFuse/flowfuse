describe('FlowForge - Broker', () => {
    describe('is accessible to users with correct permissions', () => {
        beforeEach(() => {
            cy.login('alice', 'aaPassword')
            cy.home()
        })

        it('users have access to the broker entry in the main menu', () => {
            cy.get('[data-nav="team-broker"]').should('exist')
            cy.get('[data-nav="team-broker"]').should('not.be.disabled')
            cy.get('[data-nav="team-broker"] [data-el="premium-feature"]').should('exist')
        })

        it('should display the upgrade banner when accessing the broker with the not available logo', () => {
            cy.get('[data-nav="team-broker"]').click()
            cy.get('[data-el="page-banner-feature-unavailable"]').should('exist')
            cy.contains('Broker Not Available')
            cy.contains('The MQTT Broker page offers a streamlined interface for managing your broker instance and defining client connections.')
        })
    })

    describe('is not accessible to users with insufficient permissions', () => {
        it('should have the broker menu entry hidden and route guard for viewer roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 10 })
            cy.login('bob', 'bbPassword')
            cy.home()

            cy.get('[data-nav="team-broker"]').should('not.exist')
            cy.visit('team/ateam/broker')
            cy.url().should('include', 'team/ateam/applications')
        })

        it('should have the broker menu entry hidden and route guard for dashboard roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 5 }).as('getTeamRole')
            cy.login('bob', 'bbPassword')
            cy.visit('/')

            cy.get('[data-nav="team-broker"]').should('not.exist')
            cy.visit('team/ateam/broker')
            cy.contains('There are no dashboards in this team.')
        })
    })
})
