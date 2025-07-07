describe('Team - Instances', () => {
    it('correctly displays the open editor button', () => {
        cy.login('bob', 'bbPassword')
        cy.home()

        cy.get('[data-nav="team-instances"]').click()
        cy.contains('instance-1-1')
            .parent()
            .parent()
            .parent()
            .within(() => {
                cy.get('[data-action="open-editor"]').should('not.be.disabled')
            })
        cy.contains('instance-1-2')
            .parent()
            .parent()
            .parent()
            .within(() => {
                cy.get('[data-action="open-editor"]').should('be.disabled')
            })
    })

    it('correctly displays the dashboard button', () => {
        cy.login('bob', 'bbPassword')
        cy.home()

        cy.intercept(
            'GET',
            '/api/*/teams/*/projects',
            req => req.reply(res => {
                res.send({
                    projects: res.body.projects.map(instance => ({ ...instance, ...{ settings: { dashboard2UI: '/dashboard' } } }))
                })
            })
        ).as('getProjects')

        cy.get('[data-nav="team-instances"]').click()

        cy.wait('@getProjects')

        cy.contains('instance-1-1')
            .parent()
            .parent()
            .parent()
            .within(() => {
                cy.get('[data-action="open-dashboard"]').should('not.be.disabled')
            })
        cy.contains('instance-1-2')
            .parent()
            .parent()
            .parent()
            .within(() => {
                cy.get('[data-action="open-dashboard"]').should('be.disabled')
            })
    })

    describe('Users with dashboard only permissions', () => {
        beforeEach(() => {
            // viewer roled users don't receive the teamType in the team payload
            cy.intercept('get', '/api/*/teams/slug/bteam', req => req.reply(res => {
                const { type, ...response } = res.body
                res.send(response)
            })).as('getTeam')
        })

        it('are shown a static message if no dashboard instances are found', () => {
            cy.intercept('GET', '/api/*/teams/*/user',
                req => req.reply(res => {
                    res.send({
                        role: 5
                    })
                })).as('getUser')

            cy.intercept('GET', '/api/*/teams/*/dashboard-instances',
                {
                    statusCode: 200,
                    body: {
                        count: 0,
                        projects: []
                    }
                }).as('getDashboardInstances')

            cy.login('bob', 'bbPassword')
            cy.visit('/team/bteam')

            cy.wait('@getTeam')
            cy.wait('@getUser')
            cy.wait('@getDashboardInstances')

            cy.get('[data-el="page-name"]').contains('Dashboards')
            cy.contains('A list of Node-RED instances with Dashboards belonging to this Team.')
            cy.contains('There are no dashboards in this team.')
        })

        it('are shown a list of instances when dashboard instances are found', () => {
            cy.intercept('GET', '/api/*/teams/*/user',
                req => req.reply(res => {
                    res.send({
                        role: 5
                    })
                })).as('getUser')

            cy.intercept('GET', '/api/*/teams/*/dashboard-instances',
                {
                    statusCode: 200,
                    body: {
                        count: 0,
                        projects: [
                            {
                                id: '1',
                                name: 'death-start-port-openings',
                                url: 'http://localhost:12086',
                                application: {
                                    id: 1,
                                    name: 'DS'
                                },
                                flowLastUpdatedAt: new Date().toDateString(),
                                settings: {
                                    dashboard2UI: '/dashboard'
                                }
                            },
                            {
                                id: '2',
                                name: 'death-start-ac',
                                url: 'http://localhost:12087',
                                application: {
                                    id: 1,
                                    name: 'DS'
                                },
                                flowLastUpdatedAt: new Date().toDateString(),
                                settings: {
                                    dashboard2UI: '/dashboard'
                                }
                            }
                        ]
                    }
                }).as('getDashboardInstances')

            cy.intercept('GET', '/api/*/projects/1/status', {
                id: '1',
                meta: {
                    state: 'stopped'
                }
            })
            cy.intercept('GET', '/api/*/projects/2/status', {
                id: '2',
                meta: {
                    state: 'running'
                }
            })

            cy.login('bob', 'bbPassword')
            cy.visit('/team/bteam')

            cy.wait('@getTeam')
            cy.wait('@getUser')
            cy.wait('@getDashboardInstances')

            cy.contains('death-start-port-openings')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-dashboard"]').should('be.disabled')
                })

            cy.contains('death-start-ac')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-dashboard"]').should('not.be.disabled')
                })
        })
    })
})
