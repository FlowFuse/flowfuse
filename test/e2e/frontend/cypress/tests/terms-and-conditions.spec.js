describe('FlowForge - Team Membership', () => {
    // let team // , project

    beforeEach(() => {
        cy.intercept('PUT', '/api/*/settings').as('putSettings')
        cy.login('alice', 'aaPassword')
    })

    after(() => {
        cy.login('alice', 'aaPassword')
        cy.resetTermsAndCondition()
    })

    it('admin can enable terms and conditions', () => {
        // at this point, alice is logged in, call resetTermsAndCondition() to ensure good state
        cy.resetTermsAndCondition()
        cy.home() // good practice
        cy.visit('admin/settings/general') // go to admin settings
        cy.wait(['@getSettings'])

        // first ensure all elements are hidden except tcs-required
        cy.get('[data-el="terms-and-condition-required"]').find('input').should('have.length', 1)
        cy.get('[data-el="terms-and-condition-url"]').should('have.length', 0)
        cy.get('[data-action="terms-and-condition-update"]').should('have.length', 0)

        // ensure save button is disabled until a change
        cy.get('[data-action="save-settings"]').should('be.disabled')

        // now enable T+Cs
        cy.get('[data-el="terms-and-condition-required"]').find('span.checkbox').click()

        // the URL and update button should now be present
        cy.get('[data-el="terms-and-condition-url"]').find('input').should('have.length', 1)
        cy.get('[data-action="terms-and-condition-update"]').should('have.length', 1)

        // ensure save button is STILL disabled (since URL is empty)
        cy.get('[data-action="save-settings"]').should('be.disabled')

        // update the URL
        cy.get('[data-el="terms-and-condition-url"]').find('input').type('http://a.b.c')

        // ensure save button is now enabled until a change
        cy.get('[data-action="save-settings"]').should('be.enabled')

        // save settings
        cy.get('[data-action="save-settings"]').click()
        cy.wait(['@putSettings', '@getSettings'])

        // navigate again, wait for key APIs
        cy.visit('admin/settings/general')
        cy.wait(['@getUser'])
        cy.wait(['@getTeam'])
        cy.wait(['@getTeams'])
        cy.wait(['@getTeamRole'])

        // now that changing the URL causes the T&Cs acceptance date to be updated,
        // the T&Cs dialog will be shown
        cy.get('[data-action="accept-terms-check"]').click() // tick the box
        cy.get('[data-action="accept-terms-button"]').click() // accept T+Cs
        cy.wait(['@getUser'])

        // Check settings
        cy.get('[data-el="terms-and-condition-url"]').find('input').should('have.value', 'http://a.b.c')
    })
    it('admin can update terms and conditions date', () => {
        cy.home()
        cy.visit('admin/settings/general')
        cy.wait(['@getSettings'])
        cy.wait(['@getUser'])
        cy.wait(['@getTeam'])
        cy.wait(['@getTeams'])
        cy.wait(['@getTeamRole'])

        // click update button
        cy.get('[data-action="terms-and-condition-update"]').click()

        // confirm update
        cy.get('.ff-dialog-box').should('be.visible')
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--danger').contains('Continue').click()
        cy.wait(['@putSettings', '@getSettings'])

        // at this point, user will be presented the T+Cs dialog
        cy.get('[data-action="accept-terms-check"]').find('input').should('have.value', 'false')
        cy.get('[data-action="accept-terms-button"]').should('be.disabled')
        cy.get('[data-action="logout-terms-button"]').should('be.enabled')
    })
    it('user is asked to update terms and conditions', () => {
        cy.login('bob', 'bbPassword')
        cy.visit('/')

        // user should be presented the T+Cs dialog
        cy.get('[data-action="accept-terms-check"]').find('input').should('have.value', 'false')
        cy.get('[data-action="accept-terms-button"]').should('be.disabled')
        cy.get('[data-action="logout-terms-button"]').should('be.enabled')

        // click accept check then accept button should be enabled
        cy.get('[data-action="accept-terms-check"]').click()
        cy.get('[data-action="accept-terms-button"]').should('be.enabled')

        // accept T+Cs
        cy.get('[data-action="accept-terms-button"]').click()

        // T+Cs dialog should be gone
        cy.get('[data-action="accept-terms-check"]').should('have.length', 0)
        cy.get('[data-action="accept-terms-button"]').should('have.length', 0)
        cy.get('[data-action="logout-terms-button"]').should('have.length', 0)
    })
})
