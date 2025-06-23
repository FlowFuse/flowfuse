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

        it('should have the Brokers menu entry without the missing feature icon', () => {
            cy.get('[data-nav="team-brokers"]').should('exist')
            cy.get('[data-nav="team-brokers"]').should('not.be.disabled')
            cy.get('[data-nav="team-brokers"] [data-el="premium-feature"]').should('not.exist')

            cy.get('[data-nav="team-brokers"]').click()
        })

        it('should allow users to create and delete 3\'rd party brokers', () => {
            cy.get('[data-nav="team-brokers"]').click()

            cy.get('[data-value="Bring your Own Broker"]').should('exist')
            cy.get('[data-value="Bring your Own Broker"] [data-el="select"]').click()

            cy.get('[data-action="submit"]').should('exist')
            cy.get('[data-action="submit"]').should('be.disabled')

            // filling only mandatory data
            cy.get('[data-input="name"] input').type('new-broker')

            cy.get('[data-action="submit"]').should('be.disabled')

            cy.get('[data-input="host"] input').type('broker-host')

            cy.get('[data-action="submit"]').should('be.enabled')
            cy.get('[data-action="submit"]').click()

            cy.get('[data-el="page-name"]').contains('new-broker')
            cy.get('[data-el="empty-state"]').should('exist')

            cy.get('[data-nav="team-brokers-hierarchy"]').should('exist')
            cy.get('[data-nav="team-brokers-hierarchy"]').should('have.class', 'router-link-active')

            cy.get('[data-nav="team-brokers-clients"]').should('not.exist')

            cy.get('[data-nav="team-brokers-settings"]').should('exist')
            cy.get('[data-nav="team-brokers-settings"]').click()

            // checking that pre-defined values were used
            cy.get('[data-input="name"] input').should('have.value', 'new-broker')
            cy.get('[data-input="host"] input').should('have.value', 'broker-host')
            cy.get('[data-input="port"] input').should('have.value', 1883)
            cy.get('[data-select="protocol"]').contains('MQTT')
            cy.get('[data-select="protocolVersion"]').contains('3.1')
            cy.get('[data-select="ssl"]').contains('No')
            cy.get('[data-select="verifySSL"]').contains('Yes')
            cy.get('[data-input="topicPrefix"] input').should('have.value', '#')

            cy.get('[data-input="clientId"] input').should('have.value', '')
            cy.get('[data-input="username"] input').should('have.value', '')
            cy.get('[data-input="password"] input').should('have.value', '')

            // cleanup, delete broker and check that we're redirected back to the create broker page
            //  because there are no other brokers to default to
            cy.get('[data-action="delete"]').click()
            cy.get('[data-el="platform-dialog"] [data-action="dialog-confirm"]').click()

            cy.get('[data-el="choose-broker"]').should('exist')
        })

        it('should allow users to alter their newly created 3rd party broker', () => {
            cy.get('[data-nav="team-brokers"]').click()

            cy.get('[data-value="Bring your Own Broker"]').should('exist')
            cy.get('[data-value="Bring your Own Broker"] [data-el="select"]').click()

            cy.get('[data-action="submit"]').should('exist')
            cy.get('[data-action="submit"]').should('be.disabled')

            // filling only mandatory data
            cy.get('[data-input="name"] input').type('new-broker')

            cy.get('[data-action="submit"]').should('be.disabled')

            cy.get('[data-input="host"] input').type('broker-host')

            cy.get('[data-input="port"] input').type(42)

            cy.get('[data-select="protocol"]').click()
            cy.get('[data-el="listbox-options"] [data-option="WS"]').click()

            cy.get('[data-select="protocolVersion"]').click()
            cy.get('[data-el="listbox-options"] [data-option="3.0"]').should('exist')
            cy.get('[data-el="listbox-options"] [data-option="3.1"]').should('exist')
            cy.get('[data-el="listbox-options"] [data-option="5.0"]').click()

            cy.get('[data-select="ssl"]').click()
            cy.get('[data-el="listbox-options"] [data-option="Yes"]').click()

            cy.get('[data-select="verifySSL"]').click()
            cy.get('[data-el="listbox-options"] [data-option="No"]').click()

            cy.get('[data-input="topicPrefix"] input').clear()
            cy.get('[data-input="topicPrefix"] input').type('hitchhikers_guide/dont_panic/helpful_statement/first_of_day')

            cy.get('[data-input="clientId"] input').type('marvin')
            cy.get('[data-input="username"] input').type('arthur')
            cy.get('[data-input="password"] input').type('beeblebrox')

            cy.get('[data-action="submit"]').click()

            cy.get('[data-el="page-name"]').contains('new-broker')
            cy.get('[data-el="empty-state"]').should('exist')

            cy.get('[data-nav="team-brokers-settings"]').click()

            cy.get('[data-input="name"] input').should('have.value', 'new-broker')
            cy.get('[data-input="host"] input').should('have.value', 'broker-host')
            cy.get('[data-input="port"] input').should('have.value', 42)
            cy.get('[data-select="protocol"]').contains('WS')
            cy.get('[data-select="protocolVersion"]').contains('5.0')
            cy.get('[data-select="ssl"]').contains('Yes')
            cy.get('[data-select="verifySSL"]').contains('No')
            cy.get('[data-input="topicPrefix"] input').should('have.value', 'hitchhikers_guide/dont_panic/helpful_statement/first_of_day')

            cy.get('[data-input="clientId"] input').should('have.value', 'marvin')
            cy.get('[data-input="username"] input').should('have.value', '') // overwritable but not shown
            cy.get('[data-input="password"] input').should('have.value', '') // overwritable but not shown

            // altering existing data
            cy.get('[data-input="name"] input').type('-updated')

            cy.get('[data-action="submit"]').should('be.enabled')

            cy.get('[data-input="host"] input').type('-updated')

            cy.get('[data-input="port"] input').clear()
            cy.get('[data-input="port"] input').type(1880)

            cy.get('[data-select="protocol"]').click()
            cy.get('[data-el="listbox-options"] [data-option="MQTT"]').click()

            cy.get('[data-select="protocolVersion"]').click()
            cy.get('[data-el="listbox-options"] [data-option="3.1"]').should('exist')
            cy.get('[data-el="listbox-options"] [data-option="5.0"]').should('exist')
            cy.get('[data-el="listbox-options"] [data-option="3.0"]').click()

            cy.get('[data-select="ssl"]').click()
            cy.get('[data-el="listbox-options"] [data-option="No"]').click()

            cy.get('[data-select="verifySSL"]').click()
            cy.get('[data-el="listbox-options"] [data-option="Yes"]').click()

            cy.get('[data-input="topicPrefix"] input').clear()
            cy.get('[data-input="topicPrefix"] input').type('hitchhikers_guide/dont_panic/not_so_helpful_statement/first_of_day')

            cy.get('[data-input="clientId"] input').clear()
            cy.get('[data-input="clientId"] input').type('marvin-updated')
            cy.get('[data-input="username"] input').type('arthur')
            cy.get('[data-input="password"] input').type('beeblebrox')

            cy.get('[data-action="submit"]').click()

            // navigate away from the settings and back again to make sure settings were refreshed
            cy.get('[data-nav="team-brokers-hierarchy"]').click()

            cy.get('[data-el="page-name"]').contains('new-broker-updated')
            cy.get('[data-el="empty-state"]').should('exist')

            cy.get('[data-nav="team-brokers-settings"]').click()

            // checking that pre-defined values were used
            cy.get('[data-input="name"] input').should('have.value', 'new-broker-updated')
            cy.get('[data-input="host"] input').should('have.value', 'broker-host-updated')
            cy.get('[data-input="port"] input').should('have.value', 1880)
            cy.get('[data-select="protocol"]').contains('MQTT')
            cy.get('[data-select="protocolVersion"]').contains('3.0')
            cy.get('[data-select="ssl"]').contains('No')
            cy.get('[data-select="verifySSL"]').contains('Yes')
            cy.get('[data-input="topicPrefix"] input').should('have.value', 'hitchhikers_guide/dont_panic/not_so_helpful_statement/first_of_day')

            cy.get('[data-input="clientId"] input').should('have.value', 'marvin-updated')
            cy.get('[data-input="username"] input').should('have.value', '')
            cy.get('[data-input="password"] input').should('have.value', '')

            // cleanup, delete broker and check that we're redirected back to the create broker page
            //  because there are no other brokers to default to
            cy.get('[data-action="delete"]').click()
            cy.get('[data-el="platform-dialog"] [data-action="dialog-confirm"]').click()

            cy.get('[data-el="choose-broker"]').should('exist')
        })
    })
})
