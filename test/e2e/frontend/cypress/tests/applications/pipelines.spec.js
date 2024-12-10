describe('FlowForge - Application - DevOps Pipelines', () => {
    let application
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
                application = response.body.applications.find(
                    (app) => app.name === projectName
                )
                cy.visit(`/team/${team.slug}/applications/${application.id}/instances`)
                cy.wait('@getApplication')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.login('bob', 'bbPassword')
        cy.home()
        navigateToApplication('BTeam', 'application-2')
        cy.get('[data-nav="application-pipelines"]').get('[data-el="premium-feature"]').should('exist')
    })

    it('is prompted that DevOps Pipelines are an enterprise feature', () => {
        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.url().should('include', `/applications/${application.id}/pipelines`)
        cy.get('[data-el="page-banner-feature-unavailable"]').should('exist')

        cy.get('[data-action="pipeline-add"]').should('be.disabled')
    })
})
