describe('FlowForge - Applications', () => {
    let team
    function navigateToApplication (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                const application = response.body.applications.find(
                    (application) => application.name === projectName
                )
                cy.visit(`/team/${team.slug}/applications/${application.id}/instances`)
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
                    cy.get('[data-action="open-editor"]').should('have.attr', 'disabled')
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

        it('doesn\'t display the instance kebab menu for non-owner users', () => {
            cy.intercept(
                'GET',
                '/api/*/teams/*/user',
                { role: 30 }
            ).as('getTeamRole')
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
            cy.wait('@getTeamRole')
            cy.wait('@getDevices')

            cy.get('[data-el="kebab-menu"]').should('not.exist')
        })

        describe('can search through', () => {
            it('applications', () => {
                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications/status*',
                    {
                        count: 1,
                        applications: [
                            { id: '1', instances: [], devices: [] },
                            { id: '2', instances: [], devices: [] },
                            { id: '3', instances: [], devices: [] }
                        ]
                    }
                ).as('getAppStatuses')
                cy.intercept('get', '/api/*/applications/*/devices*', {
                    meta: {},
                    count: 0,
                    devices: []
                }).as('getDevices')
                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications*',
                    {
                        count: 1,
                        applications: [
                            {
                                id: '1',
                                name: 'My First App',
                                description: 'My first empty app description',
                                instancesSummary: {
                                    instances: []
                                },
                                devicesSummary: {
                                    devices: []
                                }
                            },
                            {
                                id: '2',
                                name: 'My Second App',
                                description: 'My second empty app description',
                                instancesSummary: {
                                    instances: []
                                },
                                devicesSummary: {
                                    devices: []
                                }
                            },
                            {
                                id: '3',
                                name: 'My Third App',
                                description: 'My third empty app description',
                                instancesSummary: {
                                    instances: []
                                },
                                devicesSummary: {
                                    devices: []
                                }
                            }
                        ]
                    }
                ).as('getApplication')

                cy.home()

                cy.wait('@getAppStatuses')
                cy.wait('@getApplication')
                cy.wait('@getDevices')

                // check that we have three apps
                cy.get('[data-el="applications-list"]').children().should('have.length', 3)

                // check that we have three apps after searching a term common to all three
                cy.get('[data-form="search"]').type('my')
                cy.get('[data-el="applications-list"]').children().should('have.length', 3)

                // check that we have three apps after clearing the search input
                cy.get('[data-form="search"] input').clear()
                cy.get('[data-el="applications-list"]').children().should('have.length', 3)

                // check that we have a single app after searching a term unique to one
                cy.get('[data-form="search"] input').type('second')
                cy.get('[data-el="applications-list"]').children().should('have.length', 1).contains('My Second App')
            })

            it('devices and instances', () => {
                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications/status*',
                    {
                        count: 1,
                        applications: [
                            { id: '1', instances: [], devices: [] },
                            { id: '2', instances: [], devices: [] },
                            { id: '3', instances: [], devices: [] }
                        ]
                    }
                ).as('getAppStatuses')
                cy.intercept('get', '/api/*/applications/*/devices*', {
                    meta: {},
                    count: 0,
                    devices: []
                }).as('getDevices')
                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications*',
                    {
                        count: 1,
                        applications: [
                            {
                                id: '1',
                                name: 'My First App',
                                description: 'My first empty app description',
                                instancesSummary: {
                                    count: 6,
                                    instances: [
                                        {
                                            id: '1',
                                            name: 'common-instance-name',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        },
                                        {
                                            id: '2',
                                            name: 'not-so-common-instance-name',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        },
                                        {
                                            id: '3',
                                            name: 'xyz-instance-name',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        },
                                        {
                                            id: 'unique-instance-id',
                                            name: 'instance name with unique instance id',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        },
                                        {
                                            id: '5',
                                            name: 'instance name that matches application name',
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
                                    count: 5,
                                    devices: [
                                        {
                                            id: '1',
                                            name: 'common device name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        },
                                        {
                                            id: '2',
                                            name: 'not so common device name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        },
                                        {
                                            id: '3',
                                            name: 'xyz device name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        },
                                        {
                                            id: '4',
                                            name: 'device name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        }
                                    ]
                                }
                            },
                            {
                                id: '2',
                                name: 'My Second App',
                                description: 'My second empty app description',
                                instancesSummary: {
                                    instances: []
                                },
                                devicesSummary: {
                                    devices: [
                                        {
                                            id: '5',
                                            name: 'device name that matches application name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        }
                                    ]
                                }
                            },
                            {
                                id: '3',
                                name: 'device name that matches application name',
                                description: 'My third empty app description',
                                instancesSummary: {
                                    instances: []
                                },
                                devicesSummary: {
                                    devices: []
                                }
                            },
                            {
                                id: '4',
                                name: 'instance name that matches application name',
                                description: 'My third empty app description',
                                instancesSummary: {
                                    instances: []
                                },
                                devicesSummary: {
                                    devices: []
                                }
                            },
                            {
                                id: 'unique-application-id',
                                name: 'common app name with unique id',
                                description: 'My third empty app description',
                                instancesSummary: {
                                    count: 2,
                                    instances: [
                                        {
                                            id: '23',
                                            name: 'some instance name',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        },
                                        {

                                            id: '24',
                                            name: 'another instance name',
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
                                    count: 2,
                                    devices: [
                                        {
                                            id: '234',
                                            name: 'some device name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        },
                                        {
                                            id: '123',
                                            name: 'another device name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        }
                                    ]
                                }
                            },
                            {
                                id: '6',
                                name: 'another common app name',
                                description: 'My third empty app description',
                                instancesSummary: {
                                    count: 2,
                                    instances: [
                                        {
                                            id: '2325',
                                            name: 'some instance name',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        },
                                        {
                                            id: '2544',
                                            name: 'peculiar instance name',
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
                                    count: 2,
                                    devices: [
                                        {
                                            id: '23435',
                                            name: 'some device name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        },
                                        {
                                            id: '13234',
                                            name: 'another common device name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        }
                                    ]
                                }
                            },
                            {
                                id: '7',
                                name: 'interesting app name',
                                description: 'My third empty app description',
                                instancesSummary: {
                                    count: 2,
                                    instances: [
                                        {
                                            id: '2325',
                                            name: 'some instance name',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                },
                                                state: 'running'
                                            },
                                            url: 'https://www.google.com:123/search?q=rick+astley'
                                        },
                                        {

                                            id: '2544',
                                            name: 'interesting instance name',
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
                                    count: 2,
                                    devices: [
                                        {
                                            id: 'unique-device-id',
                                            name: 'some device name with a unique device id',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: ''
                                        },
                                        {
                                            id: '13234',
                                            name: 'another device name',
                                            lastSeenAt: null,
                                            lastSeenMs: null,
                                            status: 'offline',
                                            mode: 'autonomous',
                                            isDeploying: false,
                                            type: 'edge-entity'
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ).as('getApplication')

                cy.home()

                cy.wait('@getAppStatuses')
                cy.wait('@getApplication')
                cy.wait('@getDevices')

                // check that we have the correct number of apps, devices and instances associated with each result
                cy.get('[data-form="search"]').type('common')

                // app present due to instance/device match
                cy.get('[data-el="application-item"]').contains('My First App')
                    .parent()
                    .parent()
                    .parent()
                    .within(() => {
                        // devices and instances present match
                        cy.get('[data-el="application-instance-item"]').contains('common-instance-name')
                        cy.get('[data-el="application-instance-item"]').contains('not-so-common-instance-name')
                        cy.get('[data-el="device-tile"]').contains('common device name')
                        cy.get('[data-el="device-tile"]').contains('not so common device name')
                    })

                // app present due to name match
                cy.get('[data-el="application-item"]').contains('common app name')
                    .parent()
                    .parent()
                    .parent()
                    .within(() => {
                        // devices and instances present because no device/instance matches query but app name does
                        cy.get('[data-el="application-instance-item"]').contains('some instance name')
                        cy.get('[data-el="application-instance-item"]').contains('another instance name')
                        cy.get('[data-el="device-tile"]').contains('some device name')
                        cy.get('[data-el="device-tile"]').contains('another device name')
                    })

                cy.get('[data-form="search"] input').clear()
                cy.get('[data-form="search"]').type('another common')

                // app present due to name match but with filtered instances and devices
                cy.get('[data-el="application-item"]').contains('another common app name')
                    .parent()
                    .parent()
                    .parent()
                    .within(() => {
                        // no instances present because no matches exist
                        cy.get('[data-el="application-instance-item"]').should('not.exist')
                        // one device present that matches query
                        cy.get('[data-el="device-tile"]').should('have.length', 1)
                        cy.get('[data-el="device-tile"]').contains('another common device name')
                    })

                cy.get('[data-form="search"] input').clear()
                cy.get('[data-form="search"]').type('interesting')

                // app present due to name match but with filtered instances and devices
                cy.get('[data-el="application-item"]').contains('interesting app name')
                    .parent()
                    .parent()
                    .parent()
                    .within(() => {
                        // no devices present because no matches exist
                        cy.get('[data-el="device-tile"]').should('not.exist')
                        // one instance present that matches query
                        cy.get('[data-el="application-instance-item"]').should('have.length', 1)
                        cy.get('[data-el="application-instance-item"]').contains('interesting instance name')
                    })

                cy.get('[data-form="search"] input').clear()
                cy.get('[data-form="search"]').type('edge-entity')

                // app present due to name match but with filtered instances and devices
                cy.get('[data-el="application-item"]').contains('interesting app name')
                    .parent()
                    .parent()
                    .parent()
                    .within(() => {
                        // one device present that matches query
                        cy.get('[data-el="device-tile"]').should('exist')
                        cy.get('[data-el="device-tile"]').should('have.length', 1)
                        cy.get('[data-el="device-tile"]').contains('another device name')
                    })
            })

            it('carries the search queries onwards to the application devices page when clicking show more', () => {
                const devices = [
                    {
                        id: '1',
                        name: 'common device name',
                        lastSeenAt: null,
                        lastSeenMs: null,
                        status: 'offline',
                        mode: 'autonomous',
                        isDeploying: false,
                        type: ''
                    },
                    {
                        id: '2',
                        name: 'not so common device name',
                        lastSeenAt: null,
                        lastSeenMs: null,
                        status: 'offline',
                        mode: 'autonomous',
                        isDeploying: false,
                        type: ''
                    },
                    {
                        id: '3',
                        name: 'xyz device name with common element',
                        lastSeenAt: null,
                        lastSeenMs: null,
                        status: 'offline',
                        mode: 'autonomous',
                        isDeploying: false,
                        type: ''
                    },
                    {
                        id: '4',
                        name: 'device name that shares common attributes',
                        lastSeenAt: null,
                        lastSeenMs: null,
                        status: 'offline',
                        mode: 'autonomous',
                        isDeploying: false,
                        type: ''
                    },
                    {
                        id: '5',
                        name: 'device name and common key',
                        lastSeenAt: null,
                        lastSeenMs: null,
                        status: 'offline',
                        mode: 'autonomous',
                        isDeploying: false,
                        type: ''
                    }
                ]
                const instances = []

                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications/status*',
                    {
                        count: 1,
                        applications: [
                            {
                                id: '1',
                                instances,
                                devices
                            }
                        ]
                    }
                ).as('getAppStatuses')
                cy.intercept('get', '/api/*/applications/*/devices*', {
                    meta: {},
                    count: 5,
                    devices
                })
                    .as('getDevices')
                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications*',
                    {
                        count: 1,
                        applications: [
                            {
                                id: '1',
                                name: 'My First App',
                                description: 'My first empty app description',
                                instancesSummary: {
                                    count: 0,
                                    instances
                                },
                                devicesSummary: {
                                    count: 5,
                                    devices
                                }
                            }
                        ]
                    }
                ).as('getApplications')

                cy.intercept('GET', '/api/*/applications/1', {
                    id: '1',
                    name: 'My First App',
                    description: 'My first empty app description',
                    team: {
                        id: 'ateam',
                        name: 'ateam',
                        slug: 'ateam'
                    }
                }).as('getApplication')

                cy.intercept('GET', '/api/*/applications/1/instances*', {
                    count: 0,
                    instances
                }).as('getApplicationInstances')

                cy.intercept('GET', '/api/*/applications/1/devices*', {
                    count: 5,
                    devices
                }).as('getApplicationDevices')

                cy.home()

                cy.wait('@getAppStatuses')
                cy.wait('@getApplications')

                cy.get('[data-form="search"]').type('common')
                cy.get('[data-el="has-more-tile"]').click()

                cy.wait('@getApplication')
                cy.wait('@getApplicationInstances')
                cy.wait('@getApplicationDevices')

                cy.get('[data-form="search"]').should('exist')
                cy.get('[data-form="search"] input')
                    .invoke('val')
                    .then(val => {
                        expect(val).to.equal('common')
                    })
            })

            it('carries the search queries onwards to the application instances page when clicking show more', () => {
                const instances = [
                    {
                        id: '1',
                        name: 'common-instance-name',
                        meta: {
                            versions: {
                                launcher: '2.3.1'
                            },
                            state: 'running'
                        },
                        url: 'https://www.google.com:123/search?q=rick+astley'
                    },
                    {
                        id: '2',
                        name: 'not-so-common-instance-name',
                        meta: {
                            versions: {
                                launcher: '2.3.1'
                            },
                            state: 'running'
                        },
                        url: 'https://www.google.com:123/search?q=rick+astley'
                    },
                    {
                        id: '3',
                        name: 'xyz-instance-name-common-name',
                        meta: {
                            versions: {
                                launcher: '2.3.1'
                            },
                            state: 'running'
                        },
                        url: 'https://www.google.com:123/search?q=rick+astley'
                    },
                    {
                        id: '4',
                        name: 'instance-name-that-has-common-el',
                        meta: {
                            versions: {
                                launcher: '2.3.1'
                            },
                            state: 'running'
                        },
                        url: 'https://www.google.com:123/search?q=rick+astley'
                    },
                    {
                        id: '5',
                        name: 'another-common-instance-name-that-matches-application-name',
                        meta: {
                            versions: {
                                launcher: '2.3.1'
                            },
                            state: 'running'
                        },
                        url: 'https://www.google.com:123/search?q=rick+astley'
                    }
                ]
                const devices = []
                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications/status*',
                    {
                        count: 1,
                        applications: [
                            {
                                id: '1',
                                instances,
                                devices
                            }
                        ]
                    }
                ).as('getAppStatuses')
                cy.intercept('get', '/api/*/applications/*/devices*', {
                    meta: {},
                    count: 0,
                    devices
                })
                    .as('getDevices')
                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications*',
                    {
                        count: 1,
                        applications: [
                            {
                                id: '1',
                                name: 'My First App',
                                description: 'My first empty app description',
                                instancesSummary: {
                                    count: 5,
                                    instances
                                },
                                devicesSummary: {
                                    count: 0,
                                    devices
                                }
                            }
                        ]
                    }
                ).as('getApplications')

                cy.intercept('GET', '/api/*/applications/1', {
                    id: '1',
                    name: 'My First App',
                    description: 'My first empty app description',
                    team: {
                        id: 'ateam',
                        name: 'ateam',
                        slug: 'ateam'
                    }
                }).as('getApplication')

                cy.intercept('GET', '/api/*/applications/*/instances*', {
                    count: 5,
                    instances
                }).as('getApplicationInstances')

                cy.intercept('GET', '/api/*/applications/*/instances/status', {
                    count: 5,
                    instances: []
                }).as('getSomeStatuses')

                cy.home()

                cy.wait('@getAppStatuses')
                cy.wait('@getApplications')

                cy.get('[data-form="search"]').type('common')
                cy.get('[data-el="has-more-tile"]').click()

                cy.wait('@getApplication')
                cy.wait('@getApplicationInstances')
                cy.wait('@getSomeStatuses')

                cy.get('[data-form="search"]').should('exist')
                cy.get('[data-form="search"] input')
                    .invoke('val')
                    .then(val => {
                        expect(val).to.equal('common')
                    })
            })
        })

        describe('device kebab menu', () => {
            const MENU_ITEMS = [
                {
                    index: 0,
                    label: 'Edit Details',
                    dialogTitle: 'Update Device',
                    dialogDataEl: 'team-device-create-dialog'
                },
                {
                    index: 1,
                    label: 'Remove from Application',
                    dialogTitle: 'Remove Device from Application',
                    dialogDataEl: 'platform-dialog'
                },
                {
                    index: 2,
                    label: 'Regenerate Configuration',
                    dialogTitle: 'Device Configuration',
                    dialogDataEl: 'team-device-config-dialog',
                    dialogCancelButtonSelector: '.ff-dialog-actions > button.ff-btn--secondary'
                },
                {
                    index: 3,
                    label: 'Delete Device',
                    dialogTitle: 'Delete Device',
                    dialogDataEl: 'platform-dialog'
                }
            ]
            it('Correct dialog is shown for kebab menu items', () => {
                const devices = [
                    {
                        id: '1',
                        name: 'a device',
                        lastSeenAt: null,
                        lastSeenMs: null,
                        status: 'offline',
                        mode: 'autonomous',
                        isDeploying: false
                    }
                ]
                cy.intercept('get', '/api/*/applications/*/devices*', {
                    meta: {},
                    count: devices.length,
                    devices
                }).as('getDevices')

                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications*',
                    {
                        count: 1,
                        applications: [
                            {
                                id: 'some-id',
                                name: 'My App',
                                description: 'My app description',
                                instancesSummary: {
                                    count: 0,
                                    instances: []
                                },
                                devicesSummary: {
                                    count: 5,
                                    devices
                                }
                            }
                        ]
                    }
                ).as('getApplications')
                cy.intercept(
                    'GET',
                    '/api/*/teams/*/applications/status*',
                    {
                        count: 1,
                        applications: [{ id: 'some-id', instances: [], devices: [] }]
                    }
                ).as('getAppStatuses')

                cy.visit('/')

                cy.wait('@getApplications')
                cy.wait('@getAppStatuses')
                cy.wait('@getDevices')

                // open the kebab menu for the first device & verify that the correct dialog is opened for each item
                MENU_ITEMS.forEach((item) => {
                    cy.get('[data-el="device-tile"]').first().find('[data-el="kebab-menu"]').click()
                    cy.get('[data-el="device-tile"] .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(item.index)
                        .contains(item.label)
                        .click()
                    cy.get(`[data-el="${item.dialogDataEl}"]`).should('exist')
                    // cy.get(`[data-el="${item.dialogDataEl}"]`) should have the text `item.dialogTitle`
                    cy.get(`[data-el="${item.dialogDataEl}"] .ff-dialog-header`).contains(item.dialogTitle)
                    // cancel the dialog
                    cy.get(`[data-el="${item.dialogDataEl}"] ${item.dialogCancelButtonSelector || '[data-action="dialog-cancel"]'}`).click()
                })
            })
        })
    })
})
