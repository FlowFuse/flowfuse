describe('FlowForge - Unified Namespace Hierarchy', () => {
    describe('FlowFuse Broker', () => {
        describe('is accessible to users with correct permissions', () => {
            beforeEach(() => {
                cy.intercept('GET', '/api/*/teams/*/brokers', {
                    brokers: [],
                    meta: {},
                    count: 2
                }).as('getBrokers')
                cy.intercept('GET', '/api/*/teams/*/broker/topics', {
                    topics: [],
                    meta: {},
                    count: 2
                }).as('getTopics')
                cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                    clients: [],
                    meta: {},
                    count: 2
                }).as('getClients')

                cy.login('alice', 'aaPassword')
                cy.home()
            })

            it('users have access to the Brokers entry in the main menu', () => {
                cy.get('[data-nav="team-brokers"]').should('exist')
                cy.get('[data-nav="team-brokers"]').should('not.be.disabled')
                cy.get('[data-nav="team-brokers"] [data-el="premium-feature"]').should('exist')
            })

            it('should display the upgrade banner when accessing the broker with the not available logo', () => {
                cy.get('[data-nav="team-brokers"]').click()
                cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('exist')
                cy.contains('Brokers Not Available')
                cy.contains('The Brokers feature provides a centralized framework for managing and visualizing your entire data ecosystem, consolidating MQTT broker instances and topic structures within a single interface.')
            })
        })

        describe('is accessible to feature enabled teams ', () => {
            beforeEach(() => {
                cy.intercept('GET', '/api/*/teams/*/brokers', {
                    brokers: [],
                    meta: {},
                    count: 2
                }).as('getBrokers')
                cy.intercept('GET', '/api/*/teams/*/broker/topics', {
                    topics: [],
                    meta: {},
                    count: 2
                }).as('getTopics')
                cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                    clients: [],
                    meta: {},
                    count: 2
                }).as('getClients')
                cy.intercept('GET', '/api/*/teams/*', (req) => {
                    req.reply((response) => {
                    // ensure we keep bom enabled
                        response.body.type.properties.features.teamBroker = true
                        return response
                    })
                }).as('getTeam')
                cy.login('alice', 'aaPassword')
                cy.home()
            })

            it('should have the Brokers menu entry without the missing feature icon', () => {
                cy.get('[data-nav="team-brokers"]').should('exist')
                cy.get('[data-nav="team-brokers"]').should('not.be.disabled')
                cy.get('[data-nav="team-brokers"] [data-el="premium-feature"]').should('not.exist')
            })

            it('should correctly display a list of topics ', () => {
                cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                    clients: [
                        {
                            id: '40V9bgVGrl',
                            username: 'client',
                            acls: [
                                {
                                    action: 'both',
                                    pattern: '#',
                                    id: '4k4y4r'
                                }
                            ]
                        }
                    ],
                    meta: {},
                    count: 2
                }).as('getClients')
                cy.intercept('GET', '/api/*/teams/*/broker/topics', [
                    'foo/bar/baz',
                    'foo/thud',
                    'foo/flam/paz/daz',
                    'wibble/wabble/bork',
                    'wibble/wabble/bork/spork'
                ]).as('getTopics')
                cy.get('[data-nav="team-brokers"]').click()

                cy.wait('@getTopics')

                cy.get('[data-el="segment-wrapper"]').should('have.length', 2)

                cy.get('[data-el="segment-wrapper"][data-value="foo"]').contains('6 topics')
                cy.get('[data-el="segment-wrapper"][data-value="foo"]').contains('foo')

                // check that terminating topic segments are correctly included in the parent count
                cy.get('[data-el="segment-wrapper"][data-value="wibble"]').contains('3 topics')
                cy.get('[data-el="segment-wrapper"][data-value="wibble"]').contains('wibble')

                cy.get('[data-el="segment-wrapper"][data-value="paz"]').should('not.exist')
                cy.get('[data-el="segment-wrapper"][data-value="bar"]').should('not.exist')
                cy.get('[data-el="segment-wrapper"][data-value="thud"]').should('not.exist')
                cy.get('[data-el="segment-wrapper"][data-value="baz"]').should('not.exist')

                cy.get('[data-el="segment-wrapper"][data-value="foo"]').click()
                cy.get('[data-el="segment-wrapper"][data-value="foo"]').within(() => {
                    cy.get('[data-el="segment-wrapper"][data-value="baz"]').should('not.exist')
                    cy.get('[data-el="segment-wrapper"][data-value="bar"]').contains('bar')
                    cy.get('[data-el="segment-wrapper"][data-value="bar"]').contains('1 topic')
                    cy.get('[data-el="segment-wrapper"][data-value="bar"]').click()
                    cy.get('[data-el="segment-wrapper"][data-value="baz"]').should('exist')
                    cy.get('[data-el="segment-wrapper"][data-value="baz"]').should('contain', 'baz')

                    cy.get('[data-el="segment-wrapper"][data-value="thud"]').should('not.contain', '1 topic')

                    cy.get('[data-el="segment-wrapper"][data-value="paz"]').should('not.exist')
                    cy.get('[data-el="segment-wrapper"][data-value="flam"]').contains('flam')
                    cy.get('[data-el="segment-wrapper"][data-value="flam"]').contains('2 topics')
                    cy.get('[data-el="segment-wrapper"][data-value="flam"]').click()
                    cy.get('[data-el="segment-wrapper"][data-value="paz"]').should('exist')

                    cy.get('[data-el="segment-wrapper"]').should('have.length', 5)

                    cy.get('[data-el="segment-wrapper"][data-value="bar"] > .segment .content').click()
                    cy.get('[data-el="segment-wrapper"][data-value="flam"] > .segment .content').click()
                })

                cy.get('[data-el="segment-wrapper"][data-value="foo"] > .segment .content').click()
                cy.get('[data-el="segment-wrapper"]').should('have.length', 2)

                // check that terminating topic segments are marked with an svg icon
                cy.get('[data-el="segment-wrapper"][data-value="wibble"]').click()
                cy.get('[data-el="segment-wrapper"][data-value="wabble"]').click()
                cy.get('[data-el="segment-wrapper"][data-value="bork"]').find('svg').should('exist')
            })
        })

        describe('is not accessible to users with insufficient permissions', () => {
            it('should have the Brokers menu entry hidden and route guard for viewer roles', () => {
                cy.intercept('GET', '/api/*/teams/*/user', { role: 10 })
                cy.login('bob', 'bbPassword')
                cy.home()

                cy.get('[data-nav="team-brokers"]').should('not.exist')
                cy.visit('team/ateam/brokers/hierarchy')
                cy.url().should('include', 'team/ateam/applications')
            })

            it('should have the Brokers menu entry hidden and route guard for dashboard roles', () => {
                cy.intercept('GET', '/api/*/teams/*/user', { role: 5 }).as('getTeamRole')
                cy.login('bob', 'bbPassword')
                cy.visit('/')

                cy.get('[data-nav="team-brokers"]').should('not.exist')
                cy.visit('team/ateam/brokers/hierarchy')
                cy.contains('Dashboards')
                cy.contains('A list of Node-RED instances with Dashboards belonging to this Team.')
            })
        })
    })

    describe('3rd party brokers', () => {

    })
})
