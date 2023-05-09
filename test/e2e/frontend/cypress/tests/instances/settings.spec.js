describe('FlowForge - Instance Settings - DevOps', () => {
    function navigateToInstanceSettings (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const project = response.body.projects.find(
                    (project) => project.name === projectName
                )
                cy.visit(`/instance/${project.id}/settings/general`)
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/').as('getProjects')
    })

    it('does not show Instance actions to non-Owners of a team', () => {
        cy.login('bob', 'bbPassword')
        cy.home()
        navigateToInstanceSettings('ATeam', 'instance-1-1')

        cy.get('[data-action="change-stack"]').should('not.exist')
        cy.get('[data-nav="copy-project"]').should('not.exist')
        cy.get('[data-action="import-instance"]').should('not.exist')
        cy.get('[data-nav="change-instance-settings"]').should('not.exist')
        cy.get('[data-action="suspend-instance"]').should('not.exist')
        cy.get('[data-action="delete-instance"]').should('not.exist')
    })

    it('does not show Instance actions to non-Owners of a team', () => {
        cy.login('alice', 'aaPassword')
        cy.home()
        navigateToInstanceSettings('ATeam', 'instance-1-1')

        cy.get('[data-action="change-stack"]').should('exist')
        cy.get('[data-nav="copy-project"]').should('exist')
        cy.get('[data-action="import-instance"]').should('exist')
        cy.get('[data-nav="change-instance-settings"]').should('exist')
        cy.get('[data-action="suspend-instance"]').should('exist')
        cy.get('[data-action="delete-instance"]').should('exist')
    })
})
