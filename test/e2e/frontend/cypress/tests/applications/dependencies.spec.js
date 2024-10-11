describe('FlowForge - Application - Dependencies', () => {
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

    it('owners should have access to the dependencies tab but won\'t have access to the feature', () => {
        cy.visit(`/application/${application.id}`)
        cy.get('[data-nav="application-dependencies"]').click()

        cy.get('[data-el="page-banner-feature-unavailable"]').contains('This is a FlowFuse Enterprise feature. Please upgrade your instance of FlowFuse in order to use it.')
        cy.get('[data-el="empty-state"]').contains('Your application doesn\'t contain any Instances or Devices')
    })

    it('members should not have access to the dependencies tab and page', () => {
        cy.intercept('GET', '/api/*/teams/*/user', { role: 40 }).as('getTeamRole')

        cy.visit(`/application/${application.id}`)

        cy.get('[data-nav="application-dependencies"]').should('not.exist')

        cy.visit(`/application/${application.id}/dependencies`)

        cy.url().should('not.include', '/dependencies')
        cy.url().should('include', '/instances')
    })
})
