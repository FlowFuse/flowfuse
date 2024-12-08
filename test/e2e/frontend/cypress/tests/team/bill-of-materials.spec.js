describe('Team - Bill Of Materials', () => {
    it('should have access to the team bill of materials menu entry and page', () => {
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.get('[data-nav="team-bom"]').should('exist')
        cy.get('[data-nav="team-bom"] [data-el="premium-feature"]').should('exist')

        cy.get('[data-nav="team-bom"]').click()

        cy.url().should('include', 'bill-of-materials')

        cy.get('[data-el="page-name"]').contains('Bill Of Materials')

        cy.get('[data-el="page-banner-feature-unavailable"]').should('exist')

        cy.contains('Bill Of Materials not available!')
    })
})
