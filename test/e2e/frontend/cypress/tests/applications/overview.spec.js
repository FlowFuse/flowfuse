describe('FlowFuse - Applications', () => {
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
        cy.intercept('GET', '/api/*/projects/*/status', (req) => {
            // returns a status of running on all project calls
            const projectId = req.url.match(/\/projects\/([^/]+)\/status/)[1]
            req.reply({
                statusCode: 200,
                body: { meta: { state: 'running' }, id: projectId }
            })
        })
        cy.login('bob', 'bbPassword')
    })

    describe('Listing', () => {
        it('shows a list of cloud hosted instances', () => {
            cy.visit('team/bteam/applications')

            navigateToApplication('BTeam', 'application-2')

            cy.get('[data-el="cloud-instances"]').find('tbody tr').should('have.length', 2)

            cy.get('[data-el="cloud-instances"]').contains('instance-2-1')
            cy.get('[data-el="cloud-instances"]').contains('instance-2-with-devices')
        })
    })

    describe('The overview', () => {
        it('should display an empty state message when no instances or devices are associated with the application', () => {
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
                                instanceCount: 0,
                                deviceCount: 0
                            }
                        ]
                    })
                })
            ).as('getApplication')

            cy.visit('team/bteam/applications')

            cy.wait('@getApplication')

            cy.contains('My app')
            cy.contains('My empty app description')
            cy.contains('This Application currently has no attached Hosted Instances.')
            cy.contains('This Application currently has no attached Remote Instances.')
        })

        it('should display counter tiles for instances and devices', () => {
            cy.visit('team/bteam/applications')

            cy.get('[data-el="application-instances"]').within(() => {
                cy.get('[data-state="running"]').should('exist')
                cy.get('[data-state="error"]').should('exist')
                cy.get('[data-state="stopped"]').should('exist')
            })

            cy.get('[data-el="application-devices"]').within(() => {
                cy.get('[data-state="running"]').should('exist')
                cy.get('[data-state="error"]').should('exist')
                cy.get('[data-state="stopped"]').should('exist')
            })
        })

        it('should have interactive counter tiles which carry on the search terms to their respective targets', () => {
            cy.visit('team/bteam/applications')
            cy.get('[data-el="application-instances"] [data-state="running"]').click()
            cy.get('[data-hero="Node-RED Instances"]').should('exist')
            cy.get('[data-form="search"]').should('exist')
            cy.get('[data-form="search"] input').should('have.value', 'importing | connected | info | success | pushing | pulling | loading | updating | installing | safe | protected | running | warning | starting')

            cy.visit('team/bteam/applications')
            cy.get('[data-el="application-instances"] [data-state="error"]').click()
            cy.get('[data-hero="Node-RED Instances"]').should('exist')
            cy.get('[data-form="search"]').should('exist')
            cy.get('[data-form="search"] input').should('have.value', 'error | crashed')

            cy.visit('team/bteam/applications')
            cy.get('[data-el="application-instances"] [data-state="stopped"]').click()
            cy.get('[data-hero="Node-RED Instances"]').should('exist')
            cy.get('[data-form="search"]').should('exist')
            cy.get('[data-form="search"] input').should('have.value', 'stopping | restarting | suspending | rollback | stopped | suspended | offline | unknown')

            cy.visit('team/bteam/applications')
            cy.get('[data-el="application-devices"] [data-state="running"]').click()
            cy.get('[data-hero="Remote Instances"]').should('exist')
            cy.get('[data-form="search"]').should('exist')
            cy.get('[data-form="search"] input').should('have.value', 'importing | connected | info | success | pushing | pulling | loading | updating | installing | safe | protected | running | warning | starting')

            cy.visit('team/bteam/applications')
            cy.get('[data-el="application-devices"] [data-state="error"]').click()
            cy.get('[data-hero="Remote Instances"]').should('exist')
            cy.get('[data-form="search"]').should('exist')
            cy.get('[data-form="search"] input').should('have.value', 'error | crashed')

            cy.visit('team/bteam/applications')
            cy.get('[data-el="application-devices"] [data-state="stopped"]').click()
            cy.get('[data-hero="Remote Instances"]').should('exist')
            cy.get('[data-form="search"]').should('exist')
            cy.get('[data-form="search"] input').should('have.value', 'stopping | restarting | suspending | rollback | stopped | suspended | offline | unknown')
        })

        it('should allow users to navigate using the application summary header shortcuts', () => {
            cy.visit('team/bteam/applications')
            cy.get('[data-nav="application-instances"]').should('exist')
            cy.get('[data-nav="application-instances"]').click()
            cy.url().should('match', /applications\/.*\/instances/)
            cy.get('[data-hero="Node-RED Instances"]').should('exist')

            cy.visit('team/bteam/applications')
            cy.get('[data-nav="application-devices"]').should('exist')
            cy.get('[data-nav="application-devices"]').click()
            cy.url().should('match', /applications\/.*\/devices/)
            cy.get('[data-hero="Remote Instances"]').should('exist')

            cy.visit('team/bteam/applications')
            cy.get('[data-nav="application-device-groups"]').should('exist')
            cy.get('[data-nav="application-device-groups"]').click()
            cy.url().should('match', /applications\/.*\/device-groups/)
            cy.get('[data-hero="Application Device Groups"]').should('exist')

            cy.visit('team/bteam/applications')
            cy.get('[data-nav="application-snapshots"]').should('exist')
            cy.get('[data-nav="application-snapshots"]').click()
            cy.url().should('match', /applications\/.*\/snapshots/)
            cy.get('[data-hero="Snapshots"]').should('exist')

            cy.visit('team/bteam/applications')
            cy.get('[data-nav="application-pipelines"]').should('exist')
            cy.get('[data-nav="application-pipelines"]').click()
            cy.url().should('match', /applications\/.*\/pipelines/)
            cy.get('[data-hero="DevOps Pipelines"]').should('exist')
        })

        describe('can search through', () => {
            it('applications', () => {
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

                cy.visit('team/bteam/applications')

                cy.wait('@getApplication')

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
        })
    })
})
