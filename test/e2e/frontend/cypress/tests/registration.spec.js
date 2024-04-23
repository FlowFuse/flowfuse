describe('FlowForge - Sign Up Page', () => {
    it('should present the relevant default fields', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        cy.get('[data-form="signup-username"]').should('be.visible')
        cy.get('[data-form="signup-fullname"]').should('be.visible')
        cy.get('[data-form="signup-email"]').should('be.visible')
        cy.get('[data-form="signup-password"]').should('be.visible')

        cy.get('[data-form="signup-join-reason"]').should('not.exist')
        cy.get('[data-form="signup-accept-tcs"]').should('not.exist')

        cy.get('[data-action="sign-up"]').should('be.disabled')

        // Check sign-up button is enabled only when all the required fields are filled in
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-fullname"] input').type('fullname')
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-email"] input').type('email@example.com')
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-password"] input').type('aw3li8vb')
        cy.get('[data-action="sign-up"]').should('not.be.disabled')

        // Now the form is valid, check additional constraints

        // Valid email
        cy.get('[data-form="signup-email"] + span.ff-error-inline').should('be.empty')
        cy.get('[data-form="signup-email"] input').clear()
        cy.get('[data-form="signup-email"] input').type('email')
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-email"] + span.ff-error-inline').should('not.be.empty')
        cy.get('[data-form="signup-email"] input').type('@example.com')
        cy.get('[data-action="sign-up"]').should('not.be.disabled')
        cy.get('[data-form="signup-email"] + span.ff-error-inline').should('be.empty')

        // Password length
        cy.get('[data-form="signup-password"] input').clear()
        cy.get('[data-form="signup-password"] input').type('1234')
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-password"] input').type('aw3li8vb')
        cy.get('[data-action="sign-up"]').should('not.be.disabled')
    })

    it('should present the option to accept the T&Cs if user settings are set accordingly', () => {
        const EXAMPLE_TCS_URL = 'https://example.com/terms-and-conditions'

        cy.intercept('GET', '/api/*/settings', (req) => {
            req.continue((res) => {
                res.body['user:tcs-required'] = true
                res.body['user:tcs-url'] = EXAMPLE_TCS_URL
            })
        }).as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        cy.get('[data-form="signup-accept-tcs"]').should('be.visible')
        cy.get('[data-form="signup-accept-tcs"] a').should('have.attr', 'href', EXAMPLE_TCS_URL)

        // Check sign-up button is enabled only when all the required fields are filled in
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-form="signup-fullname"] input').type('fullname')
        cy.get('[data-form="signup-email"] input').type('email@example.com')
        cy.get('[data-form="signup-password"] input').type('aw3li8vb')
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-accept-tcs"] span.checkbox').click()
        cy.get('[data-action="sign-up"]').should('not.be.disabled')
    })

    it('disables signup button when a required field is empty', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        // Check sign-up button is enabled only when all the required fields are filled in
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-fullname"] input').type('fullname')
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-email"] input').type('email@example.com')
        cy.get('[data-action="sign-up"]').should('be.disabled')
        cy.get('[data-form="signup-password"] input').type('aw3li8vb')

        // all fields are filled in, so the signup button should be enabled
        cy.get('[data-action="sign-up"]').should('not.be.disabled')
    })
    it('prevents email and password being the same', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        // fill out the form
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-form="signup-fullname"] input').type('fullname')
        cy.get('[data-form="signup-email"] input').type('email@example.com')
        cy.get('[data-form="signup-password"] input').type('email@example.com')

        // check the error message is displayed
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('not.be.empty')
        // the text in the span  should state: Password must not match email
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('contain', 'Password must not match email')

        // check the signup button is disabled
        cy.get('[data-action="sign-up"]').should('be.disabled')
    })
    it('prevents name and password being the same', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        // fill out the form
        cy.get('[data-form="signup-username"] input').type('i-am-the-password')
        cy.get('[data-form="signup-fullname"] input').type('username')
        cy.get('[data-form="signup-email"] input').type('email@example.com')
        cy.get('[data-form="signup-password"] input').type('i-am-the-password')

        // check the error message is displayed
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('not.be.empty')
        // the text in the span  should state: Password must not match username
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('contain', 'Password must not match username')

        // check the signup button is disabled
        cy.get('[data-action="sign-up"]').should('be.disabled')
    })
    it('disables signup button for invalid email (client side)', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        // fill out the form
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-form="signup-fullname"] input').type('fullname')
        cy.get('[data-form="signup-email"] input').type('email')
        cy.get('[data-form="signup-password"] input').type('aw3li8vb')

        // check the error message is displayed
        cy.get('[data-form="signup-email"] + span.ff-error-inline').should('not.be.empty')
        // the text in the span should state: Enter a valid email address
        cy.get('[data-form="signup-email"] + span.ff-error-inline').should('contain', 'Enter a valid email address')

        // check the signup button is disabled
        cy.get('[data-action="sign-up"]').should('be.disabled')
    })
    // test functionally correct but we have no way to test server side validation
    // as there is no email configuration in the test environment
    it.skip('shows invalid email message when invalid email (server side)', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.intercept('POST', '/account/register').as('postAccountRegister')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        // fill out the form
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-form="signup-fullname"] input').type('fullname')
        cy.get('[data-form="signup-email"] input').type('1111@222222') // passes basic client side validation
        cy.get('[data-form="signup-password"] input').type('aw3li8vb')

        // click the signup button which posts to /account/register and wait for the response
        cy.get('[data-action="sign-up"]').click()
        cy.wait('@postAccountRegister')

        // check the error message is displayed
        cy.get('[data-form="signup-email"] + span.ff-error-inline').should('not.be.empty')
        // the text in the span should state: Enter a valid email address
        cy.get('[data-form="signup-email"] + span.ff-error-inline').should('contain', 'Enter a valid email address')
    })
    it('disables signup button for invalid password', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        // fill out the form
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-form="signup-fullname"] input').type('fullname')
        cy.get('[data-form="signup-email"] input').type('email@example.com')
        cy.get('[data-form="signup-password"] input').type('1234')

        // check the error message is displayed
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('not.be.empty')
        // the text in the span should state: Password needs to be longer than 8 chars
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('contain', 'Password needs to be longer than 8 chars')

        // check the signup button is disabled
        cy.get('[data-action="sign-up"]').should('be.disabled')
    })
    it('disables signup button for invalid username', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        // fill out the form
        cy.get('[data-form="signup-username"] input').type('I @m 1337')
        cy.get('[data-form="signup-fullname"] input').type('fullname')
        cy.get('[data-form="signup-email"] input').type('email@example.com')
        cy.get('[data-form="signup-password"] input').type('aw3li8vb')

        // check the error message is displayed
        cy.get('[data-form="signup-username"] + span.ff-error-inline').should('not.be.empty')
        // the text in the span should state: Must only contain a-z A-Z 0-9 - _
        cy.get('[data-form="signup-username"] + span.ff-error-inline').should('contain', 'Must only contain a-z A-Z 0-9 - _')

        // check the signup button is disabled
        cy.get('[data-action="sign-up"]').should('be.disabled')
    })
    it('modifying full name to match password should show error under password and disable the signup button', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        // fill out the form
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-form="signup-fullname"] input').type('i-am-the-passwor')
        cy.get('[data-form="signup-email"] input').type('email@example.com')
        cy.get('[data-form="signup-password"] input').type('i-am-the-password')

        // check the signup button is enabled
        cy.get('[data-action="sign-up"]').should('not.be.disabled')

        // add a 'd' to the end of the full name so that it now matches the password
        cy.get('[data-form="signup-fullname"] input').type('d')

        // check the error message is displayed
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('not.be.empty')
        // the text in the span should state: Password must not match username
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('contain', 'Password must not match name')

        // check the signup button is disabled
        cy.get('[data-action="sign-up"]').should('be.disabled')
    })
    it('modifying email name to match password should show error under password and disable the signup button', () => {
        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        // fill out the form
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-form="signup-fullname"] input').type('alice')
        cy.get('[data-form="signup-email"] input').type('email@example')
        cy.get('[data-form="signup-password"] input').type('email@example.com')

        // check the signup button is enabled
        cy.get('[data-action="sign-up"]').should('not.be.disabled')

        // add a '.com' to the end of the email so that it now matches the password
        cy.get('[data-form="signup-email"] input').type('.com')

        // check the error message is displayed
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('not.be.empty')
        // the text in the span should state: Password must not match email
        cy.get('[data-form="signup-password"] + span.ff-error-inline').should('contain', 'Password must not match email')

        // check the signup button is disabled
        cy.get('[data-action="sign-up"]').should('be.disabled')
    })

    it('should present the "What brings you to FlowForge" question if configured', () => {
        Cypress.on('window:before:load', win => {
            win.posthog = {
                onFeatureFlags: () => {},
                capture: () => {},
                identify: () => {},
                reset: () => {}
            }
        })

        cy.intercept('GET', '/api/*/settings').as('getUserSettings')
        cy.visit('/account/create')
        cy.wait('@getUserSettings')

        cy.get('[data-form="signup-join-reason"]').should('be.visible')

        // Check sign-up button is enabled only when all the required fields are filled in
        cy.get('[data-form="signup-username"] input').type('username')
        cy.get('[data-form="signup-fullname"] input').type('fullname')
        cy.get('[data-form="signup-email"] input').type('email@example.com')
        cy.get('[data-form="signup-password"] input').type('aw3li8vb')
        cy.get('[data-action="sign-up"]').should('be.disabled')

        cy.get('[data-form="signup-join-reason"] span.checkbox').first().click()
        cy.get('[data-action="sign-up"]').should('not.be.disabled')
    })
    // it('requires a password', () => {
    //     cy.visit('/')
    //     cy.get('div[label=username] input').should('be.visible')
    //     cy.get('div[label=password] input').should('not.exist')
    //     // fill out username
    //     cy.get('div[label=username] input').type('wrongusername')
    //     // click "login"
    //     cy.get('[data-action="login"]').click()
    //     // should prompt for password as well
    //     cy.get('div[label=username] input').should('be.visible')
    //     cy.get('div[label=password] input').should('be.visible')
    //     // click "login"
    //     cy.get('[data-action="login"]').click()
    //     // should report password is required
    //     cy.get('div[label=password]').should('have.class', 'ff-input--error')
    //     cy.get('[data-el="errors-password"]').should('be.visible')
    //     // check where we are
    //     cy.url().should('not.include', '/applications')
    // })

    // it('prevents a user logging in with incorrect credentials', () => {
    //     cy.visit('/')
    //     cy.get('div[label=username] input').should('be.visible')
    //     cy.get('div[label=password] input').should('not.exist')
    //     // fill out username
    //     cy.get('div[label=username] input').type('wrongusername')
    //     // click "login"
    //     cy.get('[data-action="login"]').click()
    //     // should prompt for password as well
    //     cy.get('div[label=username] input').should('be.visible')
    //     cy.get('div[label=password] input').should('be.visible')
    //     // fill out username
    //     cy.get('div[label=password] input').type('wrongpassword')
    //     // click "login"
    //     cy.get('[data-action="login"]').click()
    //     // display "Login Failed"
    //     cy.get('[data-el="errors-general"]').should('be.visible')
    //     // check where we are
    //     cy.url().should('not.include', '/applications')
    // })

    // it('allows a user to login', () => {
    //     cy.visit('/')
    //     cy.get('div[label=username] input').should('be.visible')
    //     cy.get('div[label=password] input').should('not.exist')
    //     // fill out username
    //     cy.get('div[label=username] input').type('alice')
    //     // click "login"
    //     cy.get('[data-action="login"]').click()
    //     // should prompt for password as well
    //     cy.get('div[label=username] input').should('be.visible')
    //     cy.get('div[label=password] input').should('be.visible')
    //     // fill out pasword
    //     cy.get('div[label=password] input').type('aaPassword')
    //     // click "login"
    //     cy.get('[data-action="login"]').click()
    //     // check where we are
    //     cy.url().should('include', '/applications')
    // })
    // it('prevent long password', () => {
    //     cy.visit('')
    //     // fill out credentials
    //     cy.get('div[label=username] input').type('alice')
    //     cy.get('[data-action="login"]').click()
    //     // should prompt for password as well
    //     cy.get('div[label=username] input').should('be.visible')
    //     cy.get('div[label=password] input').should('be.visible')
    //     let passwd = ''
    //     for (let i = 0; i < 1030; i++) {
    //         passwd += 'x'
    //     }
    //     cy.get('div[label=password] input').type(passwd, { delay: 0.1 })
    //     // click "login"
    //     cy.get('[data-action="login"]').click()
    //     // should have error
    //     cy.get('div[label=password]').should('have.class', 'ff-input--error')
    //     cy.get('[data-el="errors-password"]').should('be.visible')
    //     // check where we are
    //     cy.url().should('not.include', '/applications')
    // })
})
