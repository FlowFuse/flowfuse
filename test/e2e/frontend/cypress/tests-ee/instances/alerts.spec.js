describe('FlowFuse EE - Instance - Alerts', () => {
    let instance
    function navigateToInstanceSettings (teamName, instanceName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                instance = response.body.projects.find(
                    (app) => app.name === instanceName
                )
                cy.visit(`/instance/${instance.id}/settings`)
                cy.wait('@getInstance')
            })
    }
    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('show Alerts settings', () => {
        cy.intercept('PUT', '/api/*/projects/*').as('updateInstance')
        navigateToInstanceSettings('BTeam', 'instance-2-1')

        // check Alerts in list and click
        cy.get('[data-el="section-side-menu"] li').should('have.length', 8)
        cy.get('[data-el="section-side-menu"] li:last a').contains('Alerts')
        cy.get('[data-el="section-side-menu"] li:last').click()

        // Check who to notify
        cy.get('[data-el="notify-list"] div label:first label').contains('Owners')
        cy.get('[data-el="notify-list"] div label:nth-child(2) label').contains('Owners & Members')
        cy.get('[data-el="notify-list"] div label:nth-child(2) label').contains('Members')

        // Change and save changes
        cy.get('[data-el="notify-list"] div label:nth-child(2)').click()
        cy.get('[data-el="alert-save-button"]').click()

        cy.wait('@updateInstance')
        cy.wait('@getInstance')
    })
})
