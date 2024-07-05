describe('FlowForge - Applications', () => {
    function navigateToApplication (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                const application = response.body.applications.find(
                    (application) => application.name === projectName
                )
                cy.visit(`/application/${application.id}/instances`)
                cy.wait('@getApplication')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')
        cy.login('bob', 'bbPassword')
    })

    describe('Listing', () => {
        it('shows a list of cloud hosted instances', () => {
            cy.home()

            navigateToApplication('BTeam', 'application-2')

            cy.get('[data-el="cloud-instances"]').find('tbody tr').should('have.length', 2)

            cy.get('[data-el="cloud-instances"]').contains('instance-2-1')
            cy.get('[data-el="cloud-instances"]').contains('instance-2-with-devices')
        })
    })

    describe('The overview', () => {
        it('can display an application without devices and instances', () => {
            cy.intercept(
                'GET',
                '/api/*/teams/*/applications/status*',
                { count: 1, applications: [{ id: 'some-id', instances: [], devices: [] }] }
            ).as('getAppStatuses')
            cy.intercept(
                'GET',
                '/api/*/teams/*/applications*',
                req => req.reply(res => {
                    res.send({
                        count: 1,
                        applications: [
                            {
                                id: 'some-id',
                                name: 'My app',
                                description: 'My empty app description',
                                instancesSummary: {
                                    instances: [
                                    ]
                                },
                                devicesSummary: {
                                    devices: [
                                    ]
                                }
                            }
                        ]
                    })
                })
            ).as('getApplication')
            cy.intercept('get', '/api/*/applications/*/devices*', {
                meta: {},
                count: 0,
                devices: []
            }).as('getDevices')

            cy.visit('/')

            cy.wait('@getApplication')
            cy.wait('@getAppStatuses')
            cy.wait('@getDevices')

            cy.contains('My app')
            cy.contains('My empty app description')
            cy.contains('This Application currently has no attached Node-RED Instances .')
            cy.contains('This Application currently has no attached devices .')
        })

        it('can list application instances', () => {
            const devices = [
                {
                    id: 'important-id',
                    name: 'a device',
                    lastSeenAt: null,
                    lastSeenMs: null,
                    status: 'offline',
                    mode: 'autonomous',
                    isDeploying: false
                },
                {
                    id: 'another-important-id',
                    name: 'another device',
                    lastSeenAt: null,
                    lastSeenMs: null,
                    status: 'running',
                    editor: {
                        enabled: true
                    },
                    mode: 'autonomous',
                    isDeploying: false
                }
            ]
            cy.intercept(
                'GET',
                '/api/*/teams/*/applications/status*',
                { count: 1, applications: [{ id: 'some-id', instances: [], devices: [] }] }
            ).as('getAppStatuses')
            cy.intercept(
                'GET',
                '/api/*/teams/*/applications?*',
                (req) => req.reply(res => {
                    res.body = {
                        applications: [
                            {
                                id: 'some-id',
                                name: 'My app',
                                description: 'My app description',
                                instancesSummary: {
                                    instances: [
                                        {
                                            id: 1,
                                            name: 'immersive-compatible-instance',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        },
                                        {
                                            id: 2,
                                            name: 'immersive-incompatible-instance',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.0'
                                                },
                                                state: 'offline'
                                            },
                                            url: 'https://www.google.com:456/search?q=rick+ross'
                                        }
                                    ]
                                },
                                devicesSummary: {
                                    devices
                                }
                            }
                        ]
                    }
                    return res
                })
            ).as('getApplication')

            cy.intercept('get', '/api/*/applications/*/devices*', {
                meta: {},
                count: 0,
                devices: []
                // devices
            }).as('getDevices')

            cy.visit('/')

            cy.wait('@getApplication')
            cy.wait('@getAppStatuses')
            cy.wait('@getDevices')

            cy.get('[data-el="application-instance-item"')
                .contains('immersive-compatible-instance')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-editor"]').should('not.be.disabled')
                    cy.get('[data-el="kebab-menu"]').should('exist')
                    cy.contains('https://www.google.com:123/search?q=rick+astley')
                })

            cy.get('[data-el="application-instance-item"')
                .contains('immersive-incompatible-instance')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-editor"]').should('be.disabled')
                    cy.get('[data-el="kebab-menu"]').should('exist')
                    cy.contains('https://www.google.com:456/search?q=rick+ross')
                })

            cy.get('[data-el="application-devices"]').find('[data-el="device-tile"]').should('have.length', 2)

            cy.get('[data-el="application-devices"] [data-el="device-tile"]')
                .contains('a device')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="status-badge-offline"]').should('exist')
                    cy.contains('Last seen: never')
                })

            cy.get('[data-el="application-devices"] [data-el="device-tile"]')
                .contains('another device')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="status-badge-running"]').should('exist')
                    cy.contains('Last seen: never')
                })
        })

        it('hides remaining instances if above threshold', () => {
            cy.intercept(
                'GET',
                '/api/*/teams/*/applications/status*',
                { count: 1, applications: [{ id: 'some-id', instances: [], devices: [] }] }
            ).as('getAppStatuses')
            cy.intercept('get', '/api/*/applications/*/devices*', {
                meta: {},
                count: 0,
                devices: []
            }).as('getDevices')
            cy.intercept(
                'GET',
                '/api/*/teams/*/applications*',
                req => req.reply(res => {
                    res.send({
                        count: 1,
                        applications: [
                            {
                                id: 'some-id',
                                name: 'My app',
                                description: 'My app description',
                                instanceCount: 9,
                                instancesSummary: {
                                    instances: [
                                        {
                                            id: 1,
                                            name: 'instance-1',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        },
                                        {
                                            id: 2,
                                            name: 'instance-2',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.0'
                                                },
                                                state: 'offline'
                                            },
                                            url: 'https://www.google.com:456/search?q=rick+ross'
                                        },
                                        {
                                            id: 3,
                                            name: 'instance-3',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.0'
                                                },
                                                state: 'offline'
                                            },
                                            url: 'https://www.google.com:456/search?q=rick+ross'
                                        }
                                    ]
                                },
                                devicesSummary: {
                                    devices: []
                                }
                            }
                        ]
                    })
                }
                )
            ).as('getApplication')

            cy.visit('/')

            cy.wait('@getApplication')
            cy.wait('@getAppStatuses')
            cy.wait('@getDevices')

            cy.get('[data-el="application-instance-item"')
                .contains('instance-1')

            cy.get('[data-el="application-instance-item"')
                .contains('instance-2')

            cy.get('[data-el="application-instance-item"')
                .contains('instance-3')

            cy.get('[data-el="application-instances"]')
                .find('.has-more')
                .should('exist')
                .contains('6 More...')
        })

        it('can open an instance default editor', () => {
            cy.intercept(
                'GET',
                '/api/*/teams/*/applications/status*',
                { count: 1, applications: [{ id: 'some-id', instances: [], devices: [] }] }
            ).as('getAppStatuses')
            cy.intercept('get', '/api/*/applications/*/devices*', {
                meta: {},
                count: 0,
                devices: []
            }).as('getDevices')
            cy.intercept(
                'GET',
                '/api/*/teams/*/applications*',
                req => req.reply(res => {
                    res.send({
                        count: 1,
                        applications: [
                            {
                                id: 'some-id',
                                name: 'My app',
                                description: 'My empty app description',
                                instancesSummary: {
                                    instances: [
                                        {
                                            id: 1,
                                            name: 'instance-1',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        }
                                    ]
                                },
                                devicesSummary: {
                                    devices: [
                                    ]
                                }
                            }
                        ]
                    })
                })
            ).as('getApplication')

            cy.visit('/')

            cy.wait('@getApplication')
            cy.wait('@getAppStatuses')
            cy.wait('@getDevices')

            cy.get('[data-el="application-instance-item"')
                .contains('instance-1')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-editor"]')
                        .should('be.visible')
                        .should('not.be.disabled')
                    cy.get('[data-type="standard-editor"]')
                        .should('be.visible')
                        .should('not.be.disabled')
                })
        })
    })
})
