// test admin rights & access in FlowForge

describe('FlowForge platform admin users', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('can login in', () => {
        cy.url().should('include', '/overview')
    })

    it('can view (and click) the "Admin Settings" in user options', () => {
        cy.get('[data-cy="user-options"]').get('.ff-dropdown-options').should('not.exist')
        cy.get('[data-cy="user-options"]').click()
        cy.get('[data-cy="user-options"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-cy="user-options"] .ff-dropdown-options > .ff-dropdown-option').eq(1).contains('Admin Settings').should('be.visible')
        cy.get('[data-cy="user-options"] .ff-dropdown-options > .ff-dropdown-option').eq(1).click()

        // wait for APIs to return
        cy.wait('@getSettings')
        cy.wait('@getAdminStats')
        cy.wait('@getAdminLicense')

        cy.url().should('include', '/admin/overview')
    })

    it('can navigate to Admin Settings directly', () => {
        cy.visit('/admin/overview')
        cy.url().should('include', '/admin/overview')
    })
})

describe('FlowForge platform non-admin users', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('can login in', () => {
        cy.url().should('include', '/overview')
    })

    it('cannot view the "Admin Settings" in user options', () => {
        cy.get('[data-cy="user-options"]').get('.ff-dropdown-options').should('not.exist')
        cy.get('[data-cy="user-options"]').click()
        cy.get('[data-cy="user-options"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-cy="user-options"] .ff-dropdown-options > .ff-dropdown-option').eq(1).contains('Admin Settings').should('not.exist')
        cy.url().should('not.include', '/admin/overview')
    })

    it('cannot navigate to Admin Settings directly, and should be redirected', () => {
        cy.visit('/admin/overview')
        cy.url().should('not.include', '/admin/overview')
    })
})
