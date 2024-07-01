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

        it('shows the appropriate Open Editor button dependent on the instance\'s nr-launcher version', () => {
            cy.intercept(
                'GET',
                '/api/*/teams/*/applications*',
                (req) => req.reply(res => {
                    res.body = {
                        applications: [
                            {
                                instancesSummary: {
                                    instances: [
                                        {
                                            name: 'immersive-compatible-instance',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.1'
                                                }
                                            }
                                        },
                                        {
                                            name: 'immersive-incompatible-instance',
                                            meta: {
                                                versions: {
                                                    launcher: '2.3.0'
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                    return res
                })
            ).as('getApplication1')

            cy.visit('/')

            cy.wait('@getApplication1')

            cy.get('[data-el="application-instance-item"')
                .contains('immersive-compatible-instance')
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-editor"]')
                })

            cy.get('[data-el="application-instance-item"')
                .contains('immersive-incompatible-instance')
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-action="open-editor"]')
                })
        })
    })
})
