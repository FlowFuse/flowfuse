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
            cy.intercept('get', '/api/*/teams/slug/*', req => req.reply(res => {
                const { type, ...response } = res.body
                res.send(response)
            })).as('getTeam')
        })

        it('are shown a static message if no dashboard instances are found', () => {
            cy.intercept('GET', '/api/*/teams/*/dashboard-instances',
                {
                    statusCode: 200,
                    body: {
                        count: 0,
                        projects: []
                    }
                }).as('getDashboardInstances')

            cy.login('dashboard-dave', 'ddPassword')
            cy.visit('/team/ateam')

            cy.wait('@getDashboardInstances')

            cy.get('[data-el="page-name"]').contains('Dashboards')
            cy.contains('A list of Node-RED instances with Dashboards belonging to this Team.')
            cy.contains('There are no dashboards in this team.')
        })

        it('are shown a list of instances when dashboard instances are found', () => {
            cy.login('dashboard-dave', 'ddPassword')
            cy.visit('/team/ateam')

            cy.wait('@getTeam')

            cy.contains('instance-1-2')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-dashboard"]').should('be.disabled')
                })

            cy.contains('instance-1-1')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-dashboard"]').should('not.be.disabled')
                })
        })
    })
})
