describe('FlowForge - Team Audit Log', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('should show a placeholder if no activity is present', () => {
        cy.intercept('/api/*/teams/*/audit-log', {
            log: [],
            meta: {}
        }).as('getAuditLog')

        cy.visit('team/ateam/audit-log')
        cy.wait(['@getAuditLog'])

        cy.get('.ff-no-data').should('exist')
    })
})
