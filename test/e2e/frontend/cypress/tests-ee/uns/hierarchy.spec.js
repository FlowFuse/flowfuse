describe('FlowForge - Unified Namespace Hierarchy', () => {
    describe('is accessible to users with correct permissions', () => {
        beforeEach(() => {
            cy.login('alice', 'aaPassword')
            cy.home()
        })

        it('users have access to the UNS entry in the main menu', () => {
            cy.get('[data-nav="team-unified-namespace"]').should('exist')
            cy.get('[data-nav="team-unified-namespace"]').should('not.be.disabled')
            cy.get('[data-nav="team-unified-namespace"] [data-el="premium-feature"]').should('exist')
        })

        it('should display the upgrade banner when accessing the broker with the not available logo', () => {
            cy.get('[data-nav="team-unified-namespace"]').click()
            cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('exist')
            cy.contains('Topic Hierarchy Not Available')
            cy.contains('The Topic Hierarchy offers a clear, organized visualization of topic structures, providing fine-grained control over publishing and subscribing permissions.')
        })
    })

    describe('is accessible to feature enabled teams ', () => {
        let projectId
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*', (req) => {
                req.reply((response) => {
                    // ensure we keep bom enabled
                    response.body.type.properties.features.teamBroker = true
                    return response
                })
            }).as('getTeam')
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.request('GET', '/api/v1/teams/')
                .then((response) => {
                    projectId = response.body.teams[0].id
                })
        })

        it('should have the UNS menu entry without the missing feature icon', () => {
            cy.get('[data-nav="team-unified-namespace"]').should('exist')
            cy.get('[data-nav="team-unified-namespace"]').should('not.be.disabled')
            cy.get('[data-nav="team-unified-namespace"] [data-el="premium-feature"]').should('not.exist')
        })

        it('should display the empty state visible when no topics have been created', () => {
            cy.intercept('GET', '/api/*/teams/*/broker/topics', {
                topics: [],
                meta: {},
                count: 0
            }).as('getTopics')
            cy.intercept('POST', `http://localhost:3002/api/v1/teams/${projectId}/broker/client`, { statusCode: 201 }).as('submitClient')

            cy.get('[data-nav="team-unified-namespace"]').click()

            cy.wait('@getTopics')

            cy.get('[data-el="subtitle"]').contains('Topic Hierarchy')
            cy.contains('View the recently used topics and configure clients for your FlowFuse MQTT Broker.')

            cy.get('[data-el="empty-state"]').contains('Start Building Your Topic Hierarchy')
            cy.get('[data-el="empty-state"]').contains('It looks like no topics have been created yet.')
        })

        it('should correctly display a list of topics ', () => {
            cy.intercept('GET', '/api/*/teams/*/broker/topics', [
                'foo/bar/baz',
                'foo/thud',
                'foo/flam/paz/daz',
                'wibble/wabble/bork',
                'wibble/wabble/bork/spork'
            ]).as('getTopics')
            cy.get('[data-nav="team-unified-namespace"]').click()

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
        it('should have the UNS menu entry hidden and route guard for viewer roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 10 })
            cy.login('bob', 'bbPassword')
            cy.home()

            cy.get('[data-nav="team-unified-namespace"]').should('not.exist')
            cy.visit('team/ateam/broker/hierarchy')
            cy.url().should('include', 'team/ateam/applications')
        })

        it('should have the UNS menu entry hidden and route guard for dashboard roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 5 }).as('getTeamRole')
            cy.login('bob', 'bbPassword')
            cy.visit('/')

            cy.get('[data-nav="team-unified-namespace"]').should('not.exist')
            cy.visit('team/ateam/broker/hierarchy')
            cy.contains('Dashboards')
            cy.contains('A list of Node-RED instances with Dashboards belonging to this Team.')
        })
    })
})
