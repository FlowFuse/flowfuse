describe('FlowFuse - Role Based Access Control', () => {
    it('should not be able to access the team wide application role management if the feature is disabled', () => {
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.get('[data-nav="team-members"]').click()

        // checking for the additional collapsible ApplicationPermissionRow should suffice
        cy.get('[data-el="application-permissions-row"]').should('not.exist')
    })

    it.only('should not be able to access the application role management page if the feature is disabled', () => {
        cy.login('alice', 'aaPassword')
        cy.home()

        // navigate to an application's setting page
        cy.get('[data-nav="team-applications"]').click()
        cy.get('[data-el="application-item"]').first().click()
        cy.get('[data-nav="application-settings"]').first().click()

        // check that the user access side tab is not present
        cy.get('[data-nav="user-access"]').should('not.exist')

        // check that accessing the url directly redirects to the application's overview page'
        cy.url().then((url) => {
            const modifiedUrl = url.split('/').join('/') + '/user-access'
            cy.visit(modifiedUrl)
        })

        // check that we've been redirected to the application's overview page
        cy.get('[data-el="application-summary"]').should('exist')
    })
})
