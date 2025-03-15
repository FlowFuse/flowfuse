describe('FlowFuse - EE Templates', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/templates')

        // wait until two Stacks API calls complete
        cy.intercept('GET', '/api/*/templates?*').as('getTemplates')
        cy.wait('@getTemplates')
    })

    it('Alerts', () => {
        cy.visit('/admin/templates')

        // wait until two Stacks API calls complete
        cy.intercept('GET', '/api/*/templates?*').as('getTemplates')
        cy.wait('@getTemplates')

        // open first template
        cy.get('[data-el="templates"] tbody tr:first td:nth-child(2)').click()

        // check Alerts in list and click
        cy.get('[data-el="section-side-menu"] li').should('have.length', 5)
        cy.get('[data-el="section-side-menu"] li:last a').contains('Alerts')
        cy.get('[data-el="section-side-menu"] li:last').click()

        // Check who to notify
        cy.get('[data-el="notify-list"] div label:first label').contains('Owners')
        cy.get('[data-el="notify-list"] div label:nth-child(2) label').contains('Owners & Members')
        cy.get('[data-el="notify-list"] div label:nth-child(2) label').contains('Members')

        // Change and discard changes
        cy.get('[data-el="notify-list"] div label:nth-child(2)').click()
        cy.get('[data-el="discard-changes"]').click() // eslint-disable-line cypress/require-data-selectors
    })
})
