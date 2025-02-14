describe('FlowFuse - Brokers', () => {
    describe('Third Party Broker', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*/broker/topics', {
                topics: [],
                meta: {},
                count: 0
            }).as('getTopics')

            cy.login('alice', 'aaPassword')
            cy.home()
        })

        it('should not display the clients tab for third party brokers and redirect to hierarchy when accessing it directly', () => {
            cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                clients: [],
                meta: {},
                count: 0
            })
            cy.intercept('GET', '/api/*/teams/*/brokers', {
                brokers: [{
                    id: '1',
                    name: 'external-broker',
                    host: '',
                    port: 1883,
                    protocol: 'mqtt:',
                    ssl: false,
                    verifySSL: true,
                    clientId: ''
                }],
                meta: {},
                count: 0
            })

            cy.home()
            cy.get('[data-nav="team-brokers"]').click()

            cy.get('[data-nav="team-brokers-hierarchy"]').should('exist')
            cy.get('[data-nav="team-brokers-settings"]').should('exist')
            cy.get('[data-nav="team-brokers-clients"]').should('not.exist')

            cy.get('[data-el="add-new-broker"]').should('exist')
        })

        it('should allow users to navigate directly to a third party broker if they have one set up even if they have the flowfuse broker', () => {
            const brokerId = 'OPK5AMZ5aJ'

            cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                clients: [{
                    id: '1',
                    username: 'john',
                    acls: [
                        {
                            action: 'both',
                            pattern: 'both/#'
                        },
                        {
                            action: 'subscribe',
                            pattern: 'subscribe/#'
                        },
                        {
                            action: 'publish',
                            pattern: 'publish/#'
                        }
                    ]
                }],
                meta: {},
                count: 0
            })
            cy.intercept('GET', '/api/*/teams/*/brokers', {
                brokers: [{
                    id: brokerId,
                    name: 'external-broker',
                    host: '',
                    port: 1883,
                    protocol: 'mqtt:',
                    ssl: false,
                    verifySSL: true,
                    clientId: ''
                }],
                meta: {},
                count: 0
            })

            cy.visit(`/team/ateam/brokers/${brokerId}/hierarchy`)

            cy.get('[data-el="page-name"]').contains('external-broker')
            cy.get('[data-el="empty-state"]').should('exist')
        })
    })
})
