/// <reference types="cypress" />
describe('FlowFuse - Team Overview (Home) - With License', () => {
    it('is shown a thank you for signing up message', () => {
        cy.login('bob', 'bbPassword')
        cy.home()

        cy.visit('/team/ateam/?billing_session=BILLING_SESSION')
        cy.get('[data-el="notification-alert"]').should('exist')
        cy.get('[data-el="notification-alert"]').contains('Thanks for signing up to FlowFuse!')
    })
})
