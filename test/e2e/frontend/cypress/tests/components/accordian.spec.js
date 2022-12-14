describe('FlowForge - Accordion Component', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('can be open and closed', () => {
        cy.intercept('/api/*/teams/*/audit-log', {
            log: [{
                event: 'auth.login',
                id: '12345678',
                body: {},
                createdAt: '2022-12-09T10:47:02.494Z',
                scope: {
                    id: '5678',
                    type: 'team'
                },
                trigger: {
                    id: '1234',
                    type: 'user',
                    name: 'alice'
                },
                username: 'alice'
            }],
            meta: {}
        }).as('getAuditLog')

        cy.visit('team/ateam/audit-log')
        cy.wait(['@getAuditLog'])

        cy.get('[data-el="accordion"]').should('exist')
        cy.get('[data-el="accordion"] span').contains('1 Event')
        cy.get('[data-el="accordion"] .ff-accordion--content').should('be.visible')
        cy.get('[data-el="accordion"] button').click()
        cy.get('[data-el="accordion"] .ff-accordion--content').should('not.be.visible')
        cy.get('[data-el="accordion"] .ff-accordion--content').should('have.css', 'max-height').should('equal', '0px')
    })
})
