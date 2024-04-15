describe('FlowFuse - Instance - Settings - Launcher', () => {
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

    it('can set health check value', () => {
        cy.intercept('PUT', '/api/*/projects/*').as('updateInstance')

        const gotoInstance = () => {
            navigateToInstanceSettings('BTeam', 'instance-2-1')
            // find li with text "Launcher" in [data-el="section-side-menu"]
            cy.get('[data-el="section-side-menu"] li').contains('Launcher').click()
        }
        const getForm = () => {
            return cy.get('[data-el="launcher-settings-form"]')
        }

        gotoInstance()

        // ensure the first child's title is correct
        getForm().first('div').get('[data-el="form-row-title"]').contains('Heath check interval (ms)')
        // ensure the first child's numeric input exists
        getForm().first('div').get('.ff-input > input[type=number]').should('exist')

        // Change value & save
        const randomBetween6789and9876 = Math.floor(Math.random() * (9876 - 6789 + 1)) + 6789
        getForm().first('div').get('.ff-input > input[type=number]').clear()
        getForm().first('div').get('.ff-input > input[type=number]').type(randomBetween6789and9876)
        cy.get('[data-action="save-settings"]').click()
        cy.wait('@updateInstance')

        // refresh page
        gotoInstance()

        // check value is restored
        cy.get('[data-el="launcher-settings-form"]').first().get('.ff-input > input[type=number]').should('have.value', randomBetween6789and9876)
    })
})
