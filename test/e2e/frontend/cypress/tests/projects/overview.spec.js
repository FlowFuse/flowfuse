describe('FlowForge - Project - Overview', () => {
    function navigateToProject (teamName, projectName) {
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
                cy.visit(`/project/${project.id}/instances`)
                cy.wait('@getProject')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*').as('getProject')
        cy.intercept('GET', '/api/*/projects/*/snapshots').as('getProjectSnapshots')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('shows a list of cloud hosted instances', () => {
        navigateToProject('BTeam', 'project2')

        cy.get('[data-el="cloud-instances"]').find('tbody tr').should('have.length', 1)
    })
})
