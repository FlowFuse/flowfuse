describe('FlowForge - Auth', () => {
    it('successfully loads', () => {
        cy.visit('/')
    })
    it('prevents a user logging in with incorrect credentials', () => {
        cy.visit('/')
        // fill out credentials
        cy.get('div[label=username] input').type('wrongusername')
        cy.get('div[label=password] input').type('wrongpassword')
        // Ensure no error message displayed
        cy.get('[data-el="errors-general"]').should('not.be.visible')
        // click "login"
        cy.get('[data-action="login"]').click()
        // display "Login Failed"
        cy.get('[data-el="errors-general"]').should('be.visible')
        // check where we are
        cy.url().should('not.include', '/overview')
    })
    it('requires a password', () => {
        cy.visit('/')
        // fill out credentials
        cy.get('div[label=username] input').type('wrongusername')
        // click "login"
        cy.get('[data-action="login"]').click()
        // display "Required Field"
        cy.get('div[label=password]').should('have.class', 'ff-input--error')
        cy.get('[data-el="errors-password"]').should('be.visible')
        // check where we are
        cy.url().should('not.include', '/overview')
    })
    it('allows a user to login', () => {
        cy.visit('/')
        // fill out credentials
        cy.get('div[label=username] input').type('alice')
        cy.get('div[label=password] input').type('aaPassword')
        // click "login"
        cy.get('[data-action="login"]').click()
        // check where we are
        cy.url().should('include', '/overview')
    })
    it('prevent long password', () => {
        cy.visit('')
        // fill out credentials
        cy.get('div[label=username] input').type('alice')
        let passwd = ''
        for (let i = 0; i < 1030; i++) {
            passwd += 'x'
        }
        cy.get('div[label=password] input').type(passwd, { delay: 0.1 })
        // click "login"
        cy.get('[data-action="login"]').click()
        // should have error
        cy.get('div[label=password]').should('have.class', 'ff-input--error')
        cy.get('[data-el="errors-password"]').should('be.visible')
        // check where we are
        cy.url().should('not.include', '/overview')
    })
})
