describe('FlowForge - Broker', () => {
    describe('is accessible to users with correct permissions', () => {
        beforeEach(() => {
            cy.login('alice', 'aaPassword')
            cy.home()
        })

        it('users have access to the broker entry in the main menu', () => {
            cy.get('[data-nav="team-broker"]').should('exist')
            cy.get('[data-nav="team-broker"]').should('not.be.disabled')
            // cy.get('[data-nav="team-broker"] [data-el="premium-feature"]').should('exist')
        })

        // it('should display the upgrade banner when accessing the broker with the not available logo', () => {
        //     cy.get('[data-nav="team-broker"]').click()
        //     cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('exist')
        //     cy.contains('Broker Not Available')
        //     cy.contains('The MQTT Broker page offers a streamlined interface for managing your broker instance and defining client connections.')
        // })
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
        it('should have the broker menu entry without the missing feature icon', () => {
            cy.get('[data-nav="team-broker"]').should('exist')
            cy.get('[data-nav="team-broker"]').should('not.be.disabled')
            cy.get('[data-nav="team-broker"] [data-el="premium-feature"]').should('not.exist')
        })
        it('should display the empty state visible when no clients created and can create a client', () => {
            cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                clients: [],
                meta: {},
                count: 0
            }).as('getClients')
            cy.intercept('POST', `http://localhost:3002/api/v1/teams/${projectId}/broker/client`, { statusCode: 201 }).as('submitClient')

            cy.get('[data-nav="team-broker"]').click()

            cy.wait('@getClients')

            cy.get('[data-el="page-name"]').contains('MQTT Broker')
            cy.contains('Central hub for managing MQTT clients and defining ACL-based topic permissions.')

            cy.get('[data-el="empty-state"]').contains('Create your first Broker Client')
            cy.get('[data-action="create-client"]').should('exist')
            cy.get('[data-action="create-client"]').should('not.be.disabled')

            cy.get('[data-el="create-client-dialog"]').should('not.be.visible')
            cy.get('[data-action="create-client"]').click()
            cy.get('[data-el="create-client-dialog"]').should('be.visible')

            cy.get('[data-el="create-client-dialog"]').within(() => {
                cy.get('[data-el="username"] input').type('username')
                cy.get('[data-el="password"] input').type('password')
                cy.get('[data-el="confirm-password"] input').type('password')

                cy.get('[data-action="dialog-confirm"]').click()
                cy.wait('@submitClient')
            })

            cy.wait('@getClients')
        })
        it('should correctly display a list of clients ', () => {
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
                count: 0
            }).as('getClients')
            cy.get('[data-nav="team-broker"]').click()

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
                                // todo check for more data
                                cy.get('[data-el="acl"]').should('have.length', 3)
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
                                // todo check for more data
                                cy.get('[data-el="acl"]').should('have.length', 2)
                            })
                    })
            })
        })
        it('should validate the create client input modal', () => {
            // todo test modal validation
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
                count: 0
            }).as('getClients')

            cy.get('[data-nav="team-broker"]').click()

            cy.wait('@getClients')

            cy.get('[data-el="create-client-dialog"]').should('not.be.visible')
            cy.get('[data-el="client"]')
                .contains(`matt@${projectId}`)
                .within(() => {
                    cy.get('[data-action="edit-client"]').click()
                })

            cy.get('[data-el="create-client-dialog"]').should('be.visible')
            // todo check update modal validation & loaded data
            // todo check that confirming the update modal refreshes the data
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
                count: 0
            }).as('getClients')

            cy.get('[data-nav="team-broker"]').click()

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
            cy.contains('Dashboards')
            cy.contains('A list of Node-RED instances with Dashboards belonging to this Team.')
        })
    })
})
