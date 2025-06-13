describe('FlowFuse - Brokers', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/teams/*/broker/topics', {
            topics: [],
            meta: {},
            count: 0
        }).as('getTopics')

        cy.login('alice', 'aaPassword')
        cy.home()
    })

    describe('teams without the broker feature', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*', (req) => {
                req.reply((response) => {
                    // ensure we keep bom disabled
                    response.body.type.properties.features.teamBroker = false
                    return response
                })
            }).as('getTeam')

            cy.login('alice', 'aaPassword')
            cy.home()
        })

        it('users have access to the Brokers entry in the main menu', () => {
            cy.get('[data-nav="team-brokers"]').should('exist')
            cy.get('[data-nav="team-brokers"]').should('not.be.disabled')
            cy.get('[data-nav="team-brokers"] [data-el="premium-feature"]').should('exist')
        })

        it('should display the upgrade banner when accessing the clients with the missing feature icon', () => {
            cy.get('[data-nav="team-brokers"]').click()
            cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('exist')
            cy.contains('Brokers Not Available')
            cy.contains('The Brokers feature provides a centralized framework for managing and visualizing your entire data ecosystem, consolidating MQTT broker instances and topic structures within a single interface.')
        })
    })

    describe('users with insufficient permissions', () => {
        it('should have the Brokers menu entry hidden and route guard for viewer roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 10 })
            cy.login('bob', 'bbPassword')
            cy.home()

            cy.get('[data-nav="team-brokers"]').should('not.exist')
            cy.visit('team/ateam/brokers')
            cy.url().should('include', 'team/ateam/home')
        })

        it('should have the Brokers menu entry hidden and route guard for dashboard roles', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 5 }).as('getTeamRole')
            cy.login('bob', 'bbPassword')
            cy.visit('/')

            cy.get('[data-nav="team-brokers"]').should('not.exist')
            cy.visit('team/ateam/brokers')
            cy.contains('Dashboards')
            cy.contains('A list of Node-RED instances with Dashboards belonging to this Team.')
        })
    })

    it('should show the choose broker page when no team or 3rd party brokers exist', () => {
        cy.get('[data-nav="team-brokers"]').click()

        cy.get('[data-cy="page-name"]').contains('Add a new Broker')
        cy.contains('Simplified MQTT broker setup and management.')
        cy.get('[data-el="add-new-broker"]').should('not.exist')
        cy.get('[data-el="brokers-list"]').should('not.exist')

        cy.contains('Choose which Broker you\'d like to get setup with:')

        cy.get('[data-el="medium-tile"]').should('have.length', 2)
        cy.get('[data-el="medium-tile"][data-value="FlowFuse Broker"]').should('exist')
        cy.get('[data-el="medium-tile"][data-value="FlowFuse Broker"] [data-el="ribbon"]').should('exist')
        cy.get('[data-el="medium-tile"][data-value="FlowFuse Broker"] [data-el="select"]').should('exist')

        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"]').should('exist')
        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"] [data-el="select"]').should('exist')

        cy.get('[data-el="page-back"]').should('not.exist')
    })

    it('should allow users to configure the team-broker when no brokers exist and then delete it', () => {
        cy.get('[data-nav="team-brokers"]').click()

        // check that the toolbox is not present
        cy.get('[data-el="add-new-broker"]').should('not.exist')
        cy.get('[data-el="brokers-list"]').should('not.exist')

        cy.get('[data-el="medium-tile"][data-value="FlowFuse Broker"] [data-el="select"]').click()

        cy.get('[data-el="empty-state"]').should('exist')

        cy.get('[data-cy="page-name"]').contains('Add a new Broker')
        cy.contains('Simplified MQTT broker setup and management.')

        // checking we can navigate back
        cy.get('[data-el="empty-state"] [data-action="back"]').should('exist')
        cy.get('[data-el="empty-state"] [data-action="back"]').click()

        cy.get('[data-el="medium-tile"]').should('have.length', 2)
        cy.get('[data-el="medium-tile"][data-value="FlowFuse Broker"] [data-el="select"]').click()

        cy.get('[data-el="create-client-dialog"]').should('not.be.visible')

        cy.get('[data-el="empty-state"] [data-action="create-client"]').should('exist')
        cy.get('[data-el="empty-state"] [data-action="create-client"]').click()

        // check that the toolbox is not present
        cy.get('[data-el="add-new-broker"]').should('not.exist')
        cy.get('[data-el="brokers-list"]').should('not.exist')

        cy.get('[data-el="create-client-dialog"]').should('be.visible')
        cy.get('[data-el="create-client-dialog"]').within(() => {
            cy.get('[data-el="username"]').type('client-name')
            cy.get('[data-el="password"]').type('top-secret')
            cy.get('[data-el="confirm-password"]').type('top-secret')
            cy.get('[data-action="dialog-confirm"]').click()
        })

        cy.get('[data-nav="team-brokers-clients"]').should('exist')
        cy.get('[data-nav="team-brokers-hierarchy"]').should('exist')
        cy.get('[data-nav="team-brokers-settings"]').should('not.exist')

        cy.get('[data-el="client"]').should('have.length', 1)
        cy.get('[data-el="client"]').should('contain', 'client-name@')

        // cleanup
        cy.get('[data-el="client"] [data-action="delete-client"]').click()
        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] [data-action="dialog-confirm"]').click()

        cy.get('[data-nav="team-brokers-clients"]').should('not.exist')
        cy.get('[data-nav="team-brokers-hierarchy"]').should('not.exist')
        cy.get('[data-nav="team-brokers-settings"]').should('not.exist')
    })

    it('should allow users to configure third party brokers when no brokers exist and then delete it', () => {
        cy.get('[data-nav="team-brokers"]').click()

        // check that the toolbox is not present
        cy.get('[data-el="add-new-broker"]').should('not.exist')
        cy.get('[data-el="brokers-list"]').should('not.exist')

        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"] [data-el="select"]').click()

        cy.get('[data-cy="page-name"]').contains('Add a new Broker')
        cy.contains('Simplified MQTT broker setup and management.')

        cy.get('[data-form="broker-form"]').should('exist')

        // checking we can navigate back
        cy.get('[data-form="broker-form"] [data-action="back"]').should('exist')
        cy.get('[data-form="broker-form"] [data-action="back"]').click()

        cy.get('[data-el="medium-tile"]').should('have.length', 2)
        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"] [data-el="select"]').click()

        // check that the toolbox is not present
        cy.get('[data-el="add-new-broker"]').should('not.exist')
        cy.get('[data-el="brokers-list"]').should('not.exist')

        cy.get('[data-form="broker-form"]').should('exist')

        cy.get('[data-input="name"]').type('New Broker Name')
        cy.get('[data-input="host"]').type('my.internal.host')
        cy.get('[data-input="port"]').type('9999')

        cy.get('[data-select="protocol"]').click()
        cy.get('[data-option]').should('have.length', 2)
        cy.get('[data-el="listbox-options"]').contains('MQTT')
        cy.get('[data-el="listbox-options"]').contains('WS')
        cy.get('[data-option="WS"]').click()

        cy.get('[data-select="protocolVersion"]').click()
        cy.get('[data-option]').should('have.length', 3)
        cy.get('[data-el="listbox-options"]').contains('3.0')
        cy.get('[data-el="listbox-options"]').contains('3.1')
        cy.get('[data-el="listbox-options"]').contains('5.0')
        cy.get('[data-option="5.0"]').click()

        cy.get('[data-select="ssl"]').click()
        cy.get('[data-option]').should('have.length', 2)
        cy.get('[data-el="listbox-options"]').contains('Yes')
        cy.get('[data-el="listbox-options"]').contains('No')
        cy.get('[data-option="Yes"]').click()

        cy.get('[data-select="verifySSL"]').click()
        cy.get('[data-option]').should('have.length', 2)
        cy.get('[data-el="listbox-options"]').contains('Yes')
        cy.get('[data-el="listbox-options"]').contains('No')
        cy.get('[data-option="No"]').click()

        cy.get('[data-input="clientId"]').type('client-id')
        cy.get('[data-input="username"]').type('username')
        cy.get('[data-input="password"]').type('super-secret')

        cy.get('[data-action="back"]').should('exist')
        cy.get('[data-action="delete"]').should('not.exist')
        cy.get('[data-action="submit"]').should('exist')
        cy.get('[data-action="submit"]').should('not.be.disabled')
        cy.get('[data-action="submit"]').click()

        // check that the add new broker is present but not the list
        cy.get('[data-el="add-new-broker"]').should('exist')
        cy.get('[data-el="brokers-list"]').should('not.exist')

        cy.get('[data-nav="team-brokers-settings"]').should('exist')
        cy.get('[data-nav="team-brokers-hierarchy"]').should('exist')
        cy.get('[data-nav="team-brokers-clients"]').should('not.exist')

        // cleanup
        cy.get('[data-nav="team-brokers-settings"]').click()
        cy.get('[data-form="broker-form"]').should('exist')
        cy.get('[data-action="delete"]').should('exist')
        cy.get('[data-action="delete"]').click()
        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] [data-action="dialog-confirm"]').click()

        cy.get('[data-el="medium-tile"]').should('have.length', 2)
        // check that the toolbox is not present
        cy.get('[data-el="add-new-broker"]').should('not.exist')
        cy.get('[data-el="brokers-list"]').should('not.exist')
    })

    it('should only allow users to create third party brokers when the team-broker is configured', () => {
        // we deduce that the team broker is configured based on the presents of clients on the clients api response
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

        cy.visit('/team/ateam/brokers/add')

        cy.get('[data-cy="page-name"]').contains('Add a new Broker')
        cy.contains('Simplified MQTT broker setup and management.')

        cy.get('[data-el="medium-tile"]').should('have.length', 1)
        cy.get('[data-el="medium-tile"][data-value="FlowFuse Broker"]').should('not.exist')
        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"]').should('exist')
        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"] [data-el="select"]').should('exist')

        cy.get('[data-el="page-back"]').should('exist')
    })

    it('should allow users to create third party brokers and team-brokers when only a third party broker is configured', () => {
        // we deduce that the team broker is configured based on the presents of clients on the clients api response
        cy.intercept('GET', '/api/*/teams/*/broker/clients', {
            clients: [],
            meta: {},
            count: 0
        })
        cy.intercept('GET', '/api/*/teams/*/broker', {
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

        cy.visit('/team/ateam/brokers/add')

        cy.get('[data-cy="page-name"]').contains('Add a new Broker')
        cy.contains('Simplified MQTT broker setup and management.')

        cy.get('[data-el="medium-tile"]').should('have.length', 2)
        cy.get('[data-el="medium-tile"][data-value="FlowFuse Broker"]').should('exist')
        cy.get('[data-el="medium-tile"][data-value="FlowFuse Broker"] [data-el="select"]').should('exist')
        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"]').should('exist')
        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"] [data-el="select"]').should('exist')
    })

    it('should allow users to create third party brokers when a third party broker is configured alongside the team-broker', () => {
        // we deduce that the team broker is configured based on the presents of clients on the clients api response
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
        cy.intercept('GET', '/api/*/teams/*/broker', {
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

        cy.visit('/team/ateam/brokers/add')

        cy.get('[data-cy="page-name"]').contains('Add a new Broker')
        cy.contains('Simplified MQTT broker setup and management.')

        cy.get('[data-el="medium-tile"]').should('have.length', 1)
        cy.get('[data-el="medium-tile"][data-value="FlowFuse Broker"]').should('not.exist')
        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"]').should('exist')
        cy.get('[data-el="medium-tile"][data-value="Bring your Own Broker"] [data-el="select"]').should('exist')
    })

    it('should redirect users to the add broker page when no brokers configured and accessing via menu link or url', () => {
        cy.home()
        cy.get('[data-nav="team-brokers"]').click()
        cy.get('[data-el="choose-broker"]').should('exist')

        cy.visit('/team/ateam/brokers/add')
        cy.get('[data-el="choose-broker"]').should('exist')

        cy.visit('/team/ateam/brokers/')
        cy.get('[data-el="choose-broker"]').should('exist')
    })

    it('should should redirect users to a 404 page when trying to access an url that points to a non-existing broker', () => {
        cy.visit('/team/ateam/brokers/team-broker/hierarchy')
        cy.get('[data-page="not-found"]').should('exist')

        cy.visit('/team/ateam/brokers/team-broker/clients')
        cy.get('[data-page="not-found"]').should('exist')

        cy.visit('/team/ateam/brokers/external-broker/hierarchy')
        cy.get('[data-page="not-found"]').should('exist')

        cy.visit('/team/ateam/brokers/external-broker/clients')
        cy.get('[data-page="not-found"]').should('exist')
    })
})
