import dependencies from '../../fixtures/applications/dependencies.json'
const interceptBom = (dependencies = []) => {
    cy.intercept('GET', '/api/*/applications/*/bom', {
        id: 'app-id',
        name: 'application-2',
        children: [...dependencies]
    }).as('getBom')
}
describe('FlowForge - Application - Dependencies', () => {
    let application
    let team
    function navigateToApplication (teamName, projectName, instances = [], statuses = []) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )

                if (instances.length) {
                    cy.intercept('GET', '/api/*/applications/*/instances/status', {
                        count: instances.length,
                        instances
                    }).as('getStatuses')
                }
                if (statuses.length) {
                    cy.intercept('GET', '/api/*/applications/*/instances', {
                        count: statuses.length,
                        instances: statuses
                    }).as('getInstances')
                }

                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                application = response.body.applications.find(
                    (app) => app.name === projectName
                )
                cy.visit(`/team/${team.slug}/applications/${application.id}/instances`)

                if (instances.length) {
                    cy.wait('@getStatuses')
                }
                if (instances.length) {
                    cy.wait('@getInstances')
                }

                cy.wait('@getApplication')
            })
    }

    describe('Bill of Materials disabled teams', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/applications/*').as('getApplication')

            cy.login('bob', 'bbPassword')
            cy.home()
            navigateToApplication('BTeam', 'application-2')
        })

        it('owners should have access to the dependencies tab but won\'t have access to the feature if the team feature is not enabled', () => {
            cy.visit(`/team/${team.slug}/applications/${application.id}`)
            cy.get('[data-nav="application-dependencies"]').click()

            cy.get('[data-el="page-banner-feature-unavailable-to-team"]').contains('This feature is not available for your current Team. Please upgrade your Team in order to use it.')
            cy.get('[data-el="empty-state"]').contains('Your application doesn\'t contain any Instances or Devices')
        })

        it('members should not have access to the dependencies tab and page', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 40 }).as('getTeamRole')

            cy.visit(`/team/${team.slug}/applications/${application.id}`)

            cy.get('[data-nav="application-dependencies"]').should('not.exist')

            cy.visit(`/team/${team.slug}/applications/${application.id}/dependencies`)

            cy.url().should('not.include', '/dependencies')
            cy.url().should('include', '/instances')
        })
    })

    describe('Bill of Materials enabled teams', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 50 }).as('getTeamRole')
            cy.intercept('GET', '/api/*/teams/slug/*', (req) => {
                req.reply((response) => {
                    // ensure we keep bom enabled
                    response.body.type.properties.features.bom = true
                    return response
                })
            }).as('getTeam')

            cy.intercept('GET', '/api/*/applications/*').as('getApplication')

            cy.login('bob', 'bbPassword')
            cy.home()

            navigateToApplication('BTeam', 'application-2', dependencies.instances, dependencies.statuses)
            cy.wait('@getTeam')
        })

        it('have access to the dependencies tab and get an empty page when the application doesn\'t have instances or devices assigned', () => {
            interceptBom()
            cy.get('[data-nav="application-dependencies"]').click()

            cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('not.exist')
            cy.get('[data-el="empty-state"]').contains('Your application doesn\'t contain any Instances or Devices')
        })

        it('have access to the dependencies tab and can search by name', () => {
            cy.intercept('GET', 'https://registry.npmjs.com/**', {
                'dist-tags': {
                    latest: 'x.x.x'
                },
                time: {
                    modified: new Date()
                }
            }
            ).as('getExternalDependency')
            interceptBom(dependencies.dependencies)

            cy.get('[data-nav="application-dependencies"]').click()
            cy.wait('@getExternalDependency')

            cy.get('[data-el="dependency-item"]').should('have.length', 5)

            // can search by instance name
            cy.get('[data-form="search"] input').type('instance-x')
            cy.get('[data-el="dependency-item"]').should('have.length', 0)
            cy.contains('Oops! We couldn\'t find any matching results.')

            cy.get('[data-form="search"] input').clear()
            cy.get('[data-form="search"] input').type('instance-1')
            cy.get('[data-el="dependency-item"]').should('have.length', 3)
            cy.get('[data-el="dependency-item"]').contains('@package/dep-1')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="versions-list"] button').click()
                    cy.get('[data-el="versions-list"] button').contains('1 x Instances')
                    cy.get('[data-el="versions-list"]')
                        .within(() => {
                            cy.get('[data-el="instance-item"]').should('have.length', 1)
                            cy.contains('instance-1')
                        })
                })
            cy.get('[data-el="dependency-item"]').contains('@package/var-2')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="versions-list"] button').click()
                    cy.get('[data-el="versions-list"] button').contains('1 x Instances')
                    cy.get('[data-el="versions-list"]')
                        .within(() => {
                            cy.get('[data-el="instance-item"]').should('have.length', 1)
                            cy.contains('instance-1')
                        })
                })
            cy.get('[data-el="dependency-item"]').contains('@external/sem-3')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="versions-list"] button').click()
                    cy.get('[data-el="versions-list"] button').contains('1 x Instances')
                    cy.get('[data-el="versions-list"]')
                        .within(() => {
                            cy.get('[data-el="instance-item"]').should('have.length', 1)
                            cy.contains('instance-1')
                        })
                })
        })

        it('have access to the dependencies tab and can search by instance type', () => {
            cy.intercept('GET', 'https://registry.npmjs.com/**', {
                'dist-tags': {
                    latest: 'x.x.x'
                },
                time: {
                    modified: new Date()
                }
            }
            ).as('getExternalDependency')
            interceptBom(dependencies.dependencies)

            cy.get('[data-nav="application-dependencies"]').click()
            cy.wait('@getExternalDependency')

            cy.get('[data-el="dependency-item"]').should('have.length', 5)

            // can search by instance type
            cy.get('[data-form="search"] input').type('instance')
            cy.get('[data-el="dependency-item"]').should('have.length', 4)

            cy.contains('x Devices').should('not.exist')

            // can search by instance type
            cy.get('[data-form="search"] input').clear()
            cy.get('[data-form="search"] input').type('device')
            cy.get('[data-el="dependency-item"]').should('have.length', 3)

            cy.contains('x Instances').should('not.exist')
        })

        it('have access to the dependencies tab and can search by package name', () => {
            cy.intercept('GET', 'https://registry.npmjs.com/**', {
                'dist-tags': {
                    latest: 'x.x.x'
                },
                time: {
                    modified: new Date()
                }
            }
            ).as('getExternalDependency')
            interceptBom(dependencies.dependencies)

            cy.get('[data-nav="application-dependencies"]').click()
            cy.wait('@getExternalDependency')

            cy.get('[data-el="dependency-item"]').should('have.length', 5)

            // can search by package name
            cy.get('[data-form="search"] input').type('@lonely/package-1')
            cy.get('[data-el="dependency-item"]').should('have.length', 1)

            cy.get('[data-form="search"] input').clear()
            cy.get('[data-form="search"] input').type('var')
            cy.get('[data-el="dependency-item"]').should('have.length', 2)
        })

        it('have access to the dependencies tab and can search by package version', () => {
            cy.intercept('GET', 'https://registry.npmjs.com/**', {
                'dist-tags': {
                    latest: 'x.x.x'
                },
                time: {
                    modified: new Date()
                }
            }
            ).as('getExternalDependency')
            interceptBom(dependencies.dependencies)

            cy.get('[data-nav="application-dependencies"]').click()
            cy.wait('@getExternalDependency')

            cy.get('[data-el="dependency-item"]').should('have.length', 5)

            // can search by package version
            cy.get('[data-form="search"] input').type('4.4.4')
            cy.get('[data-el="dependency-item"]').should('have.length', 1)

            cy.get('[data-form="search"] input').clear()
            cy.get('[data-form="search"] input').type('1.1.1')
            cy.get('[data-el="dependency-item"]').should('have.length', 2)
        })
    })
})
