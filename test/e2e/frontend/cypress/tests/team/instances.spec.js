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
                // checking for ara-disabled because somehow should.be.enabled always returns true no matter the btn state
                cy.get('[data-action="open-editor"]').should('not.have.attr', 'aria-disabled')
            })
        cy.contains('instance-1-2')
            .parent()
            .parent()
            .parent()
            .within(() => {
                // checking for ara-disabled because somehow should.be.enabled always returns true no matter the btn state
                cy.get('[data-action="open-editor"]').should('have.attr', 'aria-disabled', 'true')
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
                // checking for ara-disabled because somehow should.be.enabled always returns true no matter the btn state
                cy.get('[data-action="open-dashboard"]').should('not.have.attr', 'aria-disabled')
            })
        cy.contains('instance-1-2')
            .parent()
            .parent()
            .parent()
            .within(() => {
                // checking for ara-disabled because somehow should.be.enabled always returns true no matter the btn state
                cy.get('[data-action="open-dashboard"]').should('have.attr', 'aria-disabled', 'true')
            })
    })

    describe('Users with dashboard only permissions', () => {
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
            cy.visit('/')

            cy.wait('@getUser')
            cy.wait('@getDashboardInstances')

            cy.get('[data-el="page-name"]').contains('Instances')
            cy.contains('A list of Node-RED instances with Dashboards belonging to this Team.')
            cy.contains('There are currently no instances with dashboards in this team')
            cy.contains(' Ask an Admin or Team Owner to verify the Instances you should have access to. ')
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
                                status: 'stopped',
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
                                status: 'running',
                                settings: {
                                    dashboard2UI: '/dashboard'
                                }
                            }
                        ]
                    }
                }).as('getDashboardInstances')

            cy.login('bob', 'bbPassword')
            cy.visit('/')

            cy.wait('@getUser')
            cy.wait('@getDashboardInstances')

            cy.contains('death-start-port-openings')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-dashboard"]').should('have.attr', 'aria-disabled', 'true')
                })

            cy.contains('death-start-ac')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-dashboard"]').should('not.have.attr', 'aria-disabled')
                })
        })
    })
})
