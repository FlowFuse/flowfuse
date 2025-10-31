function checkSearchExistence () {
    cy.get('[data-el="global-search"] .overlay').should('not.exist')

    // open the global search
    cy.get('[data-el="global-search"]').click()
    cy.get('[data-el="global-search"] .overlay').should('exist')

    // close the global search
    cy.get('[data-el="global-search"] .overlay').click()
    cy.get('[data-el="global-search"] .overlay').should('not.exist')

    // Simulate 'Ctrl + K' keyboard press
    // eslint-disable-next-line cypress/require-data-selectors
    cy.get('body').type('{ctrl}k')

    // Assert that the global search overlay appears
    cy.get('[data-el="global-search"] .overlay').should('exist')
}

describe('FlowFuse - Global Search', () => {
    describe('Globally accessible for users with full access', () => {
        beforeEach(() => {
            cy.login('alice', 'aaPassword')
        })

        it('can be accessed from the homepage', () => {
            cy.visit('/')
            checkSearchExistence()
        })

        it('can be accessed from the instances page', () => {
            cy.visit('/team/ateam/instances')
            checkSearchExistence()
        })

        it('can be accessed from the devices page', () => {
            cy.visit('/team/ateam/devices')
            checkSearchExistence()
        })

        it('can be accessed from the applications page', () => {
            cy.visit('/team/ateam/applications')
            checkSearchExistence()
        })

        it('can be accessed from the groups page', () => {
            cy.visit('/team/ateam/groups')
            checkSearchExistence()
        })

        it('can be accessed from the pipelines page', () => {
            cy.visit('/team/ateam/pipelines')
            checkSearchExistence()
        })

        it('can be accessed from the bill of materials page', () => {
            cy.visit('/team/ateam/bill-of-materials')
            checkSearchExistence()
        })

        it('can be accessed from the brokers page', () => {
            cy.visit('/team/ateam/brokers/team-broker/hierarchy')
            checkSearchExistence()
        })

        it('can be accessed from the performance page', () => {
            cy.visit('/team/ateam/performance')
            checkSearchExistence()
        })

        it('can be accessed from the team-library page', () => {
            cy.visit('/team/ateam/library/team-library')
            checkSearchExistence()
        })

        it('can be accessed from the team-members page', () => {
            cy.visit('/team/ateam/members/general')
            checkSearchExistence()
        })

        it('can be accessed from the audit log page', () => {
            cy.visit('/team/ateam/audit-log')
            checkSearchExistence()
        })

        it('can be accessed from the team billing page', () => {
            cy.visit('/team/ateam/billing')
            checkSearchExistence()
        })

        it('can be accessed from the team settings page', () => {
            cy.visit('/team/ateam/settings/general')
            checkSearchExistence()
        })

        it('can be accessed from the admin overview page', () => {
            cy.visit('/admin/overview')
            checkSearchExistence()
        })

        it('can be accessed from the admin general page', () => {
            cy.visit('/admin/users/general')
            checkSearchExistence()
        })

        it('can be accessed from the admin teams page', () => {
            cy.visit('/admin/teams')
            checkSearchExistence()
        })

        it('can be accessed from the admin audit-log page', () => {
            cy.visit('/admin/audit-log')
            checkSearchExistence()
        })

        it('can be accessed from the admin notifications  page', () => {
            cy.visit('/admin/notifications-hub')
            checkSearchExistence()
        })

        it('can be accessed from the admin team types page', () => {
            cy.visit('/admin/team-types')
            checkSearchExistence()
        })

        it('can be accessed from the admin instances type page', () => {
            cy.visit('/admin/instance-types')
            checkSearchExistence()
        })

        it('can be accessed from the admin stacks page', () => {
            cy.visit('/admin/stacks')
            checkSearchExistence()
        })

        it('can be accessed from the admin templates page', () => {
            cy.visit('/admin/templates/list')
            checkSearchExistence()
        })

        it('can be accessed from the admin blueprints page', () => {
            cy.visit('/admin/flow-blueprints')
            checkSearchExistence()
        })

        it('can be accessed from the admin general page', () => {
            cy.visit('/admin/settings/general')
            checkSearchExistence()
        })
    })

    describe('Globally accessible for users with lesser access', () => {
        it('can be accessed by users with owner roles ', () => {
            cy.login('bob', 'bbPassword')

            cy.visit('/team/bteam')
            checkSearchExistence()
        })

        it('can be accessed by users with member roles ', () => {
            cy.login('eddy', 'eePassword')

            cy.visit('/team/bteam')
            checkSearchExistence()
        })

        it('can be accessed by users with viewer roles ', () => {
            cy.intercept('GET', '/api/*/teams/*/user', (req) => {
                req.continue((res) => {
                    res.body.role = 10
                })
            }).as('getTeamRole')

            cy.login('eddy', 'eePassword')

            cy.visit('/team/bteam')
            cy.wait('@getTeamRole')
            checkSearchExistence()
        })
    })

    it('should not be accessible to dashboard access-only users', () => {
        cy.intercept('GET', '/api/*/teams/*/user', (req) => {
            req.continue((res) => {
                res.body.role = 5
            })
        }).as('getTeamRole')

        cy.login('eddy', 'eePassword')
        cy.visit('/')

        cy.wait('@getTeamRole')

        cy.get('[data-el="global-search"]').should('not.exist')
    })

    describe('Can search', () => {
        beforeEach(() => {
            cy.login('bob', 'bbPassword')
        })

        it('can search through instances', () => {
            cy.intercept('GET', '/api/*/search*').as('search')
            cy.visit('/')

            cy.get('[data-el="global-search"]').click()

            cy.get('[data-el="global-search"] .results-wrapper').should('not.exist')

            cy.get('[data-el="global-search"] input:not(.input-trigger)').type('instance')
            cy.wait('@search')

            cy.get('[data-el="global-search"] .results-wrapper').should('exist')

            cy.get('[data-el="instance-results"]').should('exist')

            cy.get('[data-el="instance-results"] [data-el="result"] [data-title="instance-1-1"]').click()
            cy.url().should('match', /\/instance\/.*\/overview/)
        })

        it('can search through devices', () => {
            cy.intercept('GET', '/api/*/search*').as('search')
            cy.visit('/team/bteam/overview')

            cy.get('[data-el="global-search"]').click()

            cy.get('[data-el="global-search"] .results-wrapper').should('not.exist')

            cy.get('[data-el="global-search"] input:not(.input-trigger)').type('dev')
            cy.wait('@search')

            cy.get('[data-el="global-search"] .results-wrapper').should('exist')

            cy.get('[data-el="device-results"]').should('exist')

            cy.get('[data-el="device-results"] [data-el="result"] [data-title="application-device-a"]').click()
            cy.url().should('match', /\/device\/.*\/overview/)
        })

        it('can search through applications', () => {
            cy.intercept('GET', '/api/*/search*').as('search')
            cy.visit('/')

            cy.get('[data-el="global-search"]').click()

            cy.get('[data-el="global-search"] .results-wrapper').should('not.exist')

            cy.get('[data-el="global-search"] input:not(.input-trigger)').type('app')
            cy.wait('@search')

            cy.get('[data-el="global-search"] .results-wrapper').should('exist')

            cy.get('[data-el="application-results"]').should('exist')

            cy.get('[data-el="application-results"] [data-el="result"] [data-title="application-1"]').click()
            cy.url().should('match', /\/applications\/.*\/instances/)
        })
    })
})
