describe('FlowForge - Blueprints', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('should flag it\'s an enterprise feature in the Admin navigation', () => {
        cy.visit('/admin/overview')
        cy.get('[data-nav="admin-flow-blueprints"]').should('exist')
        cy.get('[data-nav="admin-flow-blueprints"] [data-el="premium-feature"]').should('exist')
    })

    it('should not be accessible in OS version', () => {
        cy.visit('/admin/flow-blueprints')
        cy.url().should('not.include', '/admin/flow-blueprints')
        cy.url().should('include', '/admin/overview')
    })
})
