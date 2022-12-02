describe('FlowForge - Auth', () => {
    it('successfully loads', () => {
        cy.visit('/')
    })
    it('requires a username to start', () => {
        cy.visit('/')
        cy.get('div[label=username] input').should('be.visible')
        cy.get('div[label=password] input').should('not.exist')
        // click "login"
        cy.get('[data-action="login"]').click()
        // display "Required Field"
        cy.get('div[label=username]').should('have.class', 'ff-input--error')
        cy.get('[data-el="errors-username"]').should('be.visible')
        // check where we are
        cy.url().should('not.include', '/overview')
    })

    it('requires a password', () => {
        cy.visit('/')
        cy.get('div[label=username] input').should('be.visible')
        cy.get('div[label=password] input').should('not.exist')
        // fill out username
        cy.get('div[label=username] input').type('wrongusername')
        // click "login"
        cy.get('[data-action="login"]').click()
        // should prompt for password as well
        cy.get('div[label=username] input').should('be.visible')
        cy.get('div[label=password] input').should('be.visible')
        // click "login"
        cy.get('[data-action="login"]').click()
        // should report password is required
        cy.get('div[label=password]').should('have.class', 'ff-input--error')
        cy.get('[data-el="errors-password"]').should('be.visible')
        // check where we are
        cy.url().should('not.include', '/overview')
    })

    it('prevents a user logging in with incorrect credentials', () => {
        cy.visit('/')
        cy.get('div[label=username] input').should('be.visible')
        cy.get('div[label=password] input').should('not.exist')
        // fill out username
        cy.get('div[label=username] input').type('wrongusername')
        // click "login"
        cy.get('[data-action="login"]').click()
        // should prompt for password as well
        cy.get('div[label=username] input').should('be.visible')
        cy.get('div[label=password] input').should('be.visible')
        // fill out username
        cy.get('div[label=password] input').type('wrongpassword')
        // click "login"
        cy.get('[data-action="login"]').click()
        // display "Login Failed"
        cy.get('[data-el="errors-general"]').should('be.visible')
        // check where we are
        cy.url().should('not.include', '/overview')
    })

    it('allows a user to login', () => {
        cy.visit('/')
        cy.get('div[label=username] input').should('be.visible')
        cy.get('div[label=password] input').should('not.exist')
        // fill out username
        cy.get('div[label=username] input').type('alice')
        // click "login"
        cy.get('[data-action="login"]').click()
        // should prompt for password as well
        cy.get('div[label=username] input').should('be.visible')
        cy.get('div[label=password] input').should('be.visible')
        // fill out pasword
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
        cy.get('[data-action="login"]').click()
        // should prompt for password as well
        cy.get('div[label=username] input').should('be.visible')
        cy.get('div[label=password] input').should('be.visible')
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
