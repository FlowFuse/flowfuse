// test admin rights & access in FlowForge

describe('FlowForge', () => {
    beforeEach(() => {
        cy.visit('/')
        cy.request('post', '/account/login', {
            username: 'alice',
            password: 'aaPassword'
        }).then(() => {
            cy.visit('/')
        })
    })

    it('successfully loads', () => {
        cy.url().should('include', '/overview')
    })

    it('can navigate to Admin Settings', () => {
        cy.get('[data-cy="user-options"]').get('.ff-dropdown-options').should('not.exist')
        cy.get('[data-cy="user-options"]').click()
        cy.get('[data-cy="user-options"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-cy="user-options"] .ff-dropdown-options').contains('Admin Settings').should('be.visible')
    })
})
