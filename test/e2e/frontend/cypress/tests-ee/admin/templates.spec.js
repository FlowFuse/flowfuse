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
        cy.get('#ff-app > div > div.ff-layout--platform--wrapper > div.ff-view > main > div > div:nth-child(2) > ul > li').should('have.length', 5)
        cy.get('#ff-app > div > div.ff-layout--platform--wrapper > div.ff-view > main > div > div:nth-child(2) > ul > li > a').contains('Alerts')
        cy.get('#ff-app > div > div.ff-layout--platform--wrapper > div.ff-view > main > div > div:nth-child(2) > ul > li:last').click()

        // Check who to notify
        cy.get('#ff-app > div > div.ff-layout--platform--wrapper > div.ff-view > main > div > div:nth-child(2) > div > form > div.ff-radio-group > div > label:first > label').contains('Owners')
        cy.get('#ff-app > div > div.ff-layout--platform--wrapper > div.ff-view > main > div > div:nth-child(2) > div > form > div.ff-radio-group > div > label:nth-child(2) > label').contains('Owners & Members')
        cy.get('#ff-app > div > div.ff-layout--platform--wrapper > div.ff-view > main > div > div:nth-child(2) > div > form > div.ff-radio-group > div > label:nth-child(2) > label').contains('Members')        
    })
})
