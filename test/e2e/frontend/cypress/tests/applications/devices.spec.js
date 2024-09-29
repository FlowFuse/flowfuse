describe('FlowForge - Application - Devices', () => {
    let application
    function navigateToApplication (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                application = response.body.applications.find(
                    (app) => app.name === projectName
                )
                cy.visit(`/application/${application.id}/instances`)
                cy.wait('@getApplication')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.login('bob', 'bbPassword')
        cy.home()
        navigateToApplication('BTeam', 'application-2')
    })

    it('should list any devices associated to an application', () => {
        cy.visit(`/application/${application.id}/devices`)
        cy.url().should('include', `/application/${application.id}/devices`)

        cy.get('[data-el="devices-browser"] tbody').find('tr').should('have.length', 3)
    })

    it('is presented with a dialog confirmation when choosing "Remove from Application"', () => {
        cy.visit(`/application/${application.id}/devices`)
        cy.url().should('include', `/application/${application.id}/devices`)

        cy.get('[data-el="platform-dialog"]').should('not.be.visible')
        cy.get('[data-el="devices-browser"] tbody').find('tr').eq(0).find('[data-el="kebab-menu"]').click()
        cy.get('[data-action="device-remove-from-application"]').click()
        cy.get('[data-el="platform-dialog"]').should('be.visible')
    })
})
