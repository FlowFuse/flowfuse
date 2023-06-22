describe('FlowForge - Application - DevOps Pipelines', () => {
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
        cy.get('[data-nav="application-pipelines"]').should('exist')
    })

    it('can navigate to the /pipelines page with EE license', () => {
        cy.visit(`/application/${application.id}/pipelines`)
        cy.url().should('include', `/application/${application.id}/pipelines`)
    })
})
