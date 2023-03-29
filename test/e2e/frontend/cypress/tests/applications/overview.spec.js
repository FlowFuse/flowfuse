describe('FlowForge - Application - Overview', () => {
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
        cy.home()
    })

    it('shows a list of cloud hosted instances', () => {
        navigateToApplication('BTeam', 'application-2')

        cy.get('[data-el="cloud-instances"]').find('tbody tr').should('have.length', 2)

        cy.get('[data-el="cloud-instances"]').contains('instance-2-1')
        cy.get('[data-el="cloud-instances"]').contains('instance-2-with-devices')
    })

    it('Start an instance')
    it('Restart an instance')
    it('Suspend an instance')
    it('Delete an instance')
})
