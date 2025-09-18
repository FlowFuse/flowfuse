describe('FlowFuse - RBAC Management', () => {
    describe('With platform settings disabled', () => {
        beforeEach(() => {
            // artificially enable the team rbacApplication feature
            cy.intercept('GET', '/api/*/teams/*', (req) => {
                req.continue((res) => {
                    res.body.type.properties.features.rbacApplication = true
                    return res
                })
            })
            // artificially disable the platform rbacApplication feature
            cy.intercept('GET', '/api/v1/settings', (req) => {
                req.continue((res) => {
                    if (!res.body.features) {
                        res.body.features = {}
                    }
                    res.body.features.rbacApplication = false
                    return res
                })
            })
        })
        it('should not be able to access the team wide application role management', () => {
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-members"]').click()

            // checking for the additional collapsible ApplicationPermissionRow should suffice
            cy.get('[data-el="application-permissions-row"]').should('not.exist')
        })

        it('should not be able to access the application role management page', () => {
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
            cy.get('[data-el="application-overview-page"]').should('exist')
        })
    })

    describe('With team settings disabled', () => {
        beforeEach(() => {
            // artificially disable the team rbacApplication feature
            cy.intercept('GET', '/api/*/teams/*', (req) => {
                req.continue((res) => {
                    res.body.type.properties.features.rbacApplication = false
                    return res
                })
            })
            // artificially enable the platform rbacApplication feature
            cy.intercept('GET', '/api/v1/settings', (req) => {
                req.continue((res) => {
                    if (!res.body.features) {
                        res.body.features = {}
                    }
                    res.body.features.rbacApplication = true
                    return res
                })
            })
        })
        it('should not be able to access the team wide application role management when the team feature is disabled', () => {
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-members"]').click()

            // checking for the additional collapsible ApplicationPermissionRow should suffice
            cy.get('[data-el="application-permissions-row"]').should('not.exist')
        })

        it('should not be able to access the application role management page when the team feature is disabled', () => {
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
            cy.get('[data-el="application-overview-page"]').should('exist')
        })
    })
})
