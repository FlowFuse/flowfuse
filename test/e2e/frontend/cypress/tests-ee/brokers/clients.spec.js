describe('FlowForge - Unified Namespace Clients', () => {
    describe('FlowFuse Broker', () => {
        describe('is accessible to users with correct permissions', () => {
            beforeEach(() => {
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

        describe('is accessible to feature enabled teams ', () => {
            let projectId
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
            it('should have the Brokers menu entry without the missing feature icon', () => {
                cy.get('[data-nav="team-brokers"]').should('exist')
                cy.get('[data-nav="team-brokers"]').should('not.be.disabled')
                cy.get('[data-nav="team-brokers"] [data-el="premium-feature"]').should('not.exist')
            })

            it('should display a list of clients ', () => {
                cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                    clients: [
                        {
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
                        },
                        {
                            id: '2',
                            username: 'matt',
                            acls: [
                                {
                                    action: 'subscribe',
                                    pattern: 'subscribe/#'
                                },
                                {
                                    action: 'publish',
                                    pattern: 'publish/#'
                                }
                            ]
                        }
                    ],
                    meta: {},
                    count: 2
                }).as('getClients')

                cy.get('[data-nav="team-brokers"]').click()
                cy.get('[data-nav="team-brokers-clients"]').click()

                cy.get('[data-form="search"]').should('be.visible')
                cy.get('[data-action="create-client"]').should('be.visible')
                cy.get('[data-action="create-client"]').should('not.be.disabled')

                cy.get('[data-el="clients-list"]').should('be.visible')
                cy.get('[data-el="clients-list"] li.client').should('have.length', 2)

                cy.get('[data-el="clients-list"]').within(() => {
                    cy.get('[data-el="client"]')
                        .contains(`john@${projectId}`)
                        .contains('3 Rules')
                    cy.get('[data-el="client"]')
                        .contains(`matt@${projectId}`)
                        .contains('2 Rules')

                    cy.get('[data-el="client"]')
                        .contains(`john@${projectId}`)
                        .click()
                    cy.get('[data-el="client"]')
                        .contains(`john@${projectId}`)
                        .parent()
                        .parent()
                        .within(() => {
                            cy.get('[data-el="accordion"]')
                                .within(() => {
                                    cy.get('[data-el="acl"]').should('have.length', 3)

                                    // checking how sub/pub is displayed based on provided input
                                    cy.get('[data-el="acl"] [data-el="pub"].text-green-500').should('have.length', 2)
                                    cy.get('[data-el="acl"] [data-el="pub"].text-red-500').should('have.length', 1)
                                    cy.get('[data-el="acl"] [data-el="sub"].text-green-500').should('have.length', 2)
                                    cy.get('[data-el="acl"] [data-el="sub"].text-red-500').should('have.length', 1)
                                })
                        })
                    cy.get('[data-el="client"]')
                        .contains(`matt@${projectId}`)
                        .click()
                    cy.get('[data-el="client"]')
                        .contains(`matt@${projectId}`)
                        .parent()
                        .parent()
                        .within(() => {
                            cy.get('[data-el="accordion"]')
                                .within(() => {
                                    cy.get('[data-el="acl"]').should('have.length', 2)
                                    // checking how sub/pub is displayed based on provided input
                                    cy.get('[data-el="acl"] [data-el="pub"].text-green-500').should('have.length', 1)
                                    cy.get('[data-el="acl"] [data-el="pub"].text-red-500').should('have.length', 1)
                                    cy.get('[data-el="acl"] [data-el="sub"].text-green-500').should('have.length', 1)
                                    cy.get('[data-el="acl"] [data-el="sub"].text-red-500').should('have.length', 1)
                                })
                        })
                })
            })

            it('should validate the create client input modal', () => {
                cy.intercept('POST', '/api/*/teams/*/broker/client', { statusCode: 200 })
                    .as('saveClient')
                cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                    clients: [
                        {
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
                        }

                    ],
                    meta: {},
                    count: 1
                }).as('getClients')

                cy.get('[data-nav="team-brokers"]').click()
                cy.get('[data-nav="team-brokers-clients"]').click()

                cy.get('[data-el="create-client-dialog"]').should('not.be.visible')
                cy.get('[data-action="create-client"]').should('not.be.disabled')
                cy.get('[data-action="create-client"]').click()
                cy.get('[data-el="create-client-dialog"]').should('be.visible')

                cy.get('[data-el="create-client-dialog"]').within(() => {
                    cy.get('[data-action="dialog-confirm"]').should('be.disabled')

                    // filling in the username with an already existing one
                    cy.get('[data-el="username"] input').should('have.value', '')
                    cy.get('[data-el="username"] input').should('not.be.disabled')
                    cy.get('[data-el="username"] input').type('john')
                    cy.get('[data-action="dialog-confirm"]').should('be.disabled')

                    // filling in the password
                    cy.get('[data-el="password"] input').should('have.value', '')
                    cy.get('[data-el="password"] input').type('password')
                    cy.get('[data-action="dialog-confirm"]').should('be.disabled')

                    // filling in the confirm-password with a mismatched password to trigger an error
                    cy.get('[data-el="confirm-password"] input').should('have.value', '')
                    cy.get('[data-el="confirm-password"] input').type('another-password')
                    cy.get('[data-action="dialog-confirm"]').should('not.be.disabled')

                    cy.get('[data-el="acl-item"]').should('have.length', 1)
                    cy.get('[data-action="add-acl"]').click()
                    cy.get('[data-el="acl-item"]').should('have.length', 2)

                    cy.get('[data-action="dialog-confirm"]').click()

                    cy.contains('Client name already exists.')
                    cy.contains('The provided passwords do not match.')

                    // fill in valid data
                    cy.get('[data-el="username"] input').clear()
                    cy.get('[data-el="username"] input').type('new-client')

                    cy.get('[data-el="confirm-password"] input').clear()
                    cy.get('[data-el="confirm-password"] input').type('password')

                    cy.get('[data-el="acl-item"]').last().within(() => {
                        cy.get('[data-el="listbox"]').click()
                        cy.get('[data-option="Subscribe"]').click()
                        cy.get('[data-input="pattern"] input').type('topic/#')
                    })

                    cy.get('[data-action="dialog-confirm"]').click()
                })
                cy.wait('@saveClient')
                cy.wait('@getClients')
            })

            it('should allow to edit an existing client', () => {
                cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                    clients: [
                        {
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
                        },
                        {
                            id: '2',
                            username: 'matt',
                            acls: [
                                {
                                    action: 'subscribe',
                                    pattern: 'subscribe/#'
                                },
                                {
                                    action: 'publish',
                                    pattern: 'publish/#'
                                }
                            ]
                        }
                    ],
                    meta: {},
                    count: 2
                }).as('getClients')
                cy.intercept('PUT', '/api/*/teams/*/broker/client/*', {
                    statusCode: 200
                }).as('updateClient')

                cy.get('[data-nav="team-brokers"]').click()
                cy.get('[data-nav="team-brokers-clients"]').click()

                cy.wait('@getClients')

                cy.get('[data-el="create-client-dialog"]').should('not.be.visible')
                cy.get('[data-el="client"]')
                    .contains(`matt@${projectId}`)
                    .within(() => {
                        cy.get('[data-action="edit-client"]').click()
                    })

                cy.get('[data-el="create-client-dialog"]').should('be.visible')

                cy.get('[data-el="create-client-dialog"]')
                    .within(() => {
                        cy.get('[data-el="username"] input').should('have.value', 'matt')
                        cy.get('[data-el="username"] input').should('be.disabled')

                        cy.get('[data-action="add-acl"]').should('exist')

                        cy.get('[data-el="password"] input').should('have.attr', 'placeholder', 'Leave blank to keep current password')
                        cy.get('[data-el="confirm-password"] input').should('have.attr', 'placeholder', 'Leave blank to keep current password')

                        cy.get('[data-el="acl-item"]').should('have.length', 2)

                        cy.get('[data-el="acl-list"] li:first-child')
                            .within(() => {
                                cy.get('[data-el="listbox"] input').should('have.value', 'Subscribe')
                                cy.get('[data-input="pattern"] input').should('have.value', 'subscribe/#')
                            })

                        cy.get('[data-el="acl-list"] li:last-child')
                            .within(() => {
                                cy.get('[data-el="listbox"] input').should('have.value', 'Publish')
                                cy.get('[data-input="pattern"] input').should('have.value', 'publish/#')
                            })

                        cy.get('[data-action="dialog-confirm"]').should('be.disabled')

                        cy.get('[data-el="password"] input').type('new-password')
                        cy.get('[data-el="confirm-password"] input').type('new-password')

                        cy.get('[data-action="dialog-confirm"]').should('not.be.disabled')

                        cy.get('[data-action="dialog-confirm"]').click()
                    })

                cy.wait('@updateClient')
                cy.wait('@getClients')
            })

            it('should allow to delete an existing client', () => {
                cy.intercept('DELETE', '/api/*/teams/*/broker/client/*', {
                    statusCode: 200,
                    body: { status: 'okay' }
                }).as('deleteClient')
                cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                    clients: [
                        {
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
                        }
                    ],
                    meta: {},
                    count: 1
                }).as('getClients')

                cy.get('[data-nav="team-brokers"]').click()
                cy.get('[data-nav="team-brokers-clients"]').click()

                cy.get('[data-el="platform-dialog"]').should('not.be.visible')
                cy.get('[data-action="delete-client"]').click()
                cy.get('[data-el="platform-dialog"]').should('be.visible')

                cy.get('[data-el="platform-dialog"]').within(() => {
                    cy.contains('Are you sure you want to delete this Client?')
                    cy.get('[data-action="dialog-confirm"]').click()
                })

                // checking that the calls are made is more than enough
                cy.wait('@deleteClient')
                cy.wait('@getClients')
            })
        })

        describe('is not accessible to users with insufficient permissions', () => {
            it('should have the Brokers menu entry hidden and route guard for viewer roles', () => {
                cy.intercept('GET', '/api/*/teams/*/user', { role: 10 })
                cy.login('bob', 'bbPassword')
                cy.home()

                cy.get('[data-nav="team-brokers"]').should('not.exist')
                cy.visit('team/ateam/brokers/clients')
                cy.url().should('include', 'team/ateam/applications')
            })

            it('should have the Brokers menu entry hidden and route guard for dashboard roles', () => {
                cy.intercept('GET', '/api/*/teams/*/user', { role: 5 }).as('getTeamRole')
                cy.login('bob', 'bbPassword')
                cy.visit('/')

                cy.get('[data-nav="team-brokers"]').should('not.exist')
                cy.visit('team/ateam/brokers/clients')
                cy.contains('Dashboards')
                cy.contains('A list of Node-RED instances with Dashboards belonging to this Team.')
            })
        })
    })

    describe('3rd party brokers', () => {

    })
})
