describe('FlowForge - Team Audit Log', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('should show a placeholder if no activity is present', () => {
        cy.intercept('/api/*/teams/*/audit-log?*', {
            log: [],
            meta: {}
        }).as('getAuditLog')

        cy.visit('team/ateam/audit-log')
        cy.wait(['@getAuditLog'])

        cy.get('.ff-no-data').should('exist')
    })

    describe('FlowForge Team Audit Logs filtering', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*/audit-log*').as('getAuditLog')

            cy.visit('/team/ateam/audit-log')

            cy.wait('@getAuditLog')
        })

        it('provides a list of users to filter by', () => {
            cy.get('[data-el="filter-users"]').find('.ff-dropdown-option').should('have.length', 3)
        })

        it('enables filtering by a user', () => {
            cy.get('[data-cy="filter-users"] .ff-dropdown-options').should('not.exist')

            // Check Alice Skywalker Events - should be 4
            cy.get('[data-el="filter-users"] .ff-dropdown').click()
            cy.get('[data-el="filter-users"] .ff-dropdown-options').should('be.visible')

            cy.get('[data-el="filter-users"] .ff-dropdown-options > .ff-dropdown-option').eq(1).contains('Alice Skywalker').should('be.visible')
            cy.get('[data-el="filter-users"] .ff-dropdown-options > .ff-dropdown-option').eq(1).click()
            cy.wait('@getAuditLog')

            // length when running in isolation is 4, in tandem with the rest of the E2E tests - it's 6.
            cy.get('[data-el="audit-log"]').find('.ff-audit-entry').should('have.length.least', 4)

            // Check Bob Solo Events - should be 0
            cy.get('[data-el="filter-users"] .ff-dropdown').click()
            cy.get('[data-el="filter-users"] .ff-dropdown-options').should('be.visible')

            cy.get('[data-el="filter-users"] .ff-dropdown-options > .ff-dropdown-option').eq(2).contains('Bob Solo').should('be.visible')
            cy.get('[data-el="filter-users"] .ff-dropdown-options > .ff-dropdown-option').eq(2).click()
            cy.wait('@getAuditLog')

            cy.get('[data-el="audit-log"]').find('.ff-audit-entry').should('have.length', 0)
        })
    })
})
