describe('FlowForge - Stacks', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/stacks')

        // wait until two Stacks API calls complete
        cy.intercept('GET', '/api/*/stacks?*').as('getStacks')
        cy.wait(['@getStacks', '@getStacks'])
    })

    it('loads stacks into relevant tables', () => {
        cy.get('[data-el="active-stacks"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="active-stacks"] tbody').contains('td', 'stack1')

        cy.get('[data-el="inactive-stacks"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="inactive-stacks"] tbody').contains('td', 'No Inactive Stacks Found')
    })

    it('can create a new version of a stack, and deactivate the replaced stack', () => {
        cy.intercept('POST', '/api/*/stacks').as('createStack')

        cy.get('[data-el="active-stacks"] tbody .ff-kebab-menu').click()
        cy.get('[data-el="active-stacks"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(0).click()

        cy.get('.ff-dialog-box').should('be.visible')

        // confirm creation
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').click()

        // wait for creation to finish
        cy.wait('@createStack')

        // check it has been created
        cy.get('[data-el="active-stacks"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="active-stacks"] tbody').contains('td', 'stack1-copy')

        // and that old stack has been moved
        cy.get('[data-el="inactive-stacks"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="inactive-stacks"] tbody').contains('td', 'stack1')
    })
})
