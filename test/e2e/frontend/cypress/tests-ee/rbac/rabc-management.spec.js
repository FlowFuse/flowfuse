describe('FlowFuse - RBAC GUI Management', () => {
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

    describe('Plain Team role management', () => {
        beforeEach(() => {
            cy.intercept('PUT', '/api/*/teams/*/members/*').as('putTeamMember')
        })

        it('admins should be able to access team wide application role management page', () => {
            cy.login('adminAllan', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-members"]').click()

            // check that bob has an owner role
            cy.get('[data-el="row-no-role-barry"]').contains('None')

            // expand the row for bob
            cy.get('[data-el="row-no-role-barry"] [data-el="collapsible-row-toggle"]').click()

            cy.get('[data-el="application-permission-dialog"]').should('not.exist')

            // find the next collapsible row which is the application permissions row
            cy.get('[data-el="row-no-role-barry"]').next('.collapsible')
                .within(() => {
                    cy.get('[data-el="app-item-application-6"]').contains('None')
                    cy.get('[data-el="app-item-application-6"] [data-action="update-role"] svg').click()
                })

            // set the application role viewer to bob
            cy.get('[data-el="application-permission-dialog"]').should('be.visible')
            cy.get('[data-el="application-permission-dialog"] button').contains('None').click()
            cy.get('[data-el="application-permission-dialog"] [data-action="dialog-confirm"]').should('be.disabled')
            cy.get('[data-el=listbox-options] [data-option="Viewer"]').click()
            cy.get('[data-el="application-permission-dialog"] [data-action="dialog-confirm"]').click()

            cy.wait('@putTeamMember')

            // check that bob has a viewer role
            cy.get('[data-el="row-no-role-barry"]').next('.collapsible').contains('Viewer')

            // revert bob to a None role
            cy.get('[data-el="row-no-role-barry"]').next('.collapsible')
                .within(() => {
                    cy.get('[data-el="app-item-application-6"]').contains('Viewer')
                    cy.get('[data-el="app-item-application-6"] [data-action="update-role"] svg').click()
                })
            cy.get('[data-el="application-permission-dialog"] button').contains('Viewer').click()
            cy.get('[data-el=listbox-options] [data-option="None"]').click()
            cy.get('[data-el="application-permission-dialog"] [data-action="dialog-confirm"]').click()
            cy.wait('@putTeamMember')
        })

        it('admins should be able to access the application role management page', () => {
            cy.login('adminAllan', 'aaPassword')
            cy.home()

            // navigate to an application's setting page
            cy.get('[data-nav="team-applications"]').click()
            cy.get('[data-el="application-item"]').first().click()
            cy.get('[data-nav="application-settings"]').first().click()

            // check that the user access side tab is present
            cy.get('[data-nav="user-access"]').should('exist')

            // click on the user access tab
            cy.get('[data-nav="user-access"]').click()

            // check that we can see the user access page
            cy.get('[data-el="application-user-access"]').should('exist')

            // check that we can see team members in the user access page
            cy.get('[data-el="user-access-table"]').should('exist')
        })

        it('team owners should be able to access team wide application role management page', () => {
            cy.login('ownerOwen', 'ooPassword')
            cy.home()

            cy.get('[data-nav="team-members"]').click()

            // check that noRoleBarry has no role
            cy.get('[data-el="row-no-role-barry"]').contains('None')

            // expand the row for noRoleBarry
            cy.get('[data-el="row-no-role-barry"] [data-el="collapsible-row-toggle"]').click()

            cy.get('[data-el="application-permission-dialog"]').should('not.exist')

            // find the next collapsible row which is the application permissions row
            cy.get('[data-el="row-no-role-barry"]').next('.collapsible')
                .within(() => {
                    cy.get('[data-el="app-item-application-6"]').contains('None')
                    cy.get('[data-el="app-item-application-6"] [data-action="update-role"] svg').click()
                })

            // set the application role viewer to noRoleBarry
            cy.get('[data-el="application-permission-dialog"]').should('be.visible')
            cy.get('[data-el="application-permission-dialog"] button').contains('None').click()
            cy.get('[data-el="application-permission-dialog"] [data-action="dialog-confirm"]').should('be.disabled')
            cy.get('[data-el=listbox-options] [data-option="Viewer"]').click()
            cy.get('[data-el="application-permission-dialog"] [data-action="dialog-confirm"]').click()

            cy.wait('@putTeamMember')

            // check that noRoleBarry has a viewer role
            cy.get('[data-el="row-no-role-barry"]').next('.collapsible').contains('Viewer')

            // revert noRoleBarry to a None role
            cy.get('[data-el="row-no-role-barry"]').next('.collapsible')
                .within(() => {
                    cy.get('[data-el="app-item-application-6"]').contains('Viewer')
                    cy.get('[data-el="app-item-application-6"] [data-action="update-role"] svg').click()
                })
            cy.get('[data-el="application-permission-dialog"] button').contains('Viewer').click()
            cy.get('[data-el=listbox-options] [data-option="None"]').click()
            cy.get('[data-el="application-permission-dialog"] [data-action="dialog-confirm"]').click()
            cy.wait('@putTeamMember')
        })

        it('team owners should be able to access the application role management page', () => {
            cy.login('ownerOwen', 'ooPassword')
            cy.home()

            // navigate to an application's setting page
            cy.get('[data-nav="team-applications"]').click()
            cy.get('[data-el="application-item"]').first().click()
            cy.get('[data-nav="application-settings"]').first().click()

            // check that the user access side tab is present
            cy.get('[data-nav="user-access"]').should('exist')

            // click on the user access tab
            cy.get('[data-nav="user-access"]').click()

            // check that we can see the user access page
            cy.get('[data-el="application-user-access"]').should('exist')

            // check that we can see team members in the user access page
            cy.get('[data-el="user-access-table"]').should('exist')
        })

        it('team members should not be able to access the team or application role management page', () => {
            cy.login('memberMike', 'mmPassword')
            cy.home()

            // navigate to an application's setting page
            cy.get('[data-nav="team-applications"]').click()
            cy.get('[data-el="application-item"]').first().click()
            cy.get('[data-nav="application-settings"]').first().click()

            // check that the user access side tab is not present
            cy.get('[data-nav="user-access"]').should('not.exist')

            // check that accessing the url directly redirects to the application's overview page
            cy.url().then((url) => {
                const modifiedUrl = url.split('/').join('/') + '/user-access'
                cy.visit(modifiedUrl)
            })

            // check that we've been redirected to the application's overview page
            cy.get('[data-el="application-overview-page"]').should('exist')
        })

        it('team viewers should not be able to access the team or application role management page', () => {
            cy.login('viewerVictor', 'vvPassword')
            cy.home()

            // navigate to an application's setting page
            cy.get('[data-nav="team-applications"]').click()
            cy.get('[data-el="application-item"]').first().click()
            cy.get('[data-nav="application-settings"]').first().click()

            // check that the user access side tab is not present
            cy.get('[data-nav="user-access"]').should('not.exist')

            // check that accessing the url directly redirects to the application's overview page
            cy.url().then((url) => {
                const modifiedUrl = url.split('/').join('/') + '/user-access'
                cy.visit(modifiedUrl)
            })

            // check that we've been redirected to the application's overview page
            cy.get('[data-el="application-overview-page"]').should('exist')
        })

        it('team dashboard should not be able to access the application role management page', () => {
            cy.login('dashboardDan', 'ddPassword')
            cy.visit('/')

            // navigate to an application's setting page
            cy.get('[data-nav="team-applications"]').should('not.exist')

            // check that the user access side tab is not present
            cy.get('[data-nav="user-access"]').should('not.exist')

            // checking that a plain dashboard user has access to all application instances when he has no additional rbac permissions set
            cy.get('[data-el="instances-table"]').should('exist')
            cy.get('[data-el="instances-table"] tbody tr').should('have.length', 6)
            cy.get('[data-el="instances-table"] [data-el="row-application-1-instance-1"]').should('exist')
            cy.get('[data-el="instances-table"] [data-el="row-application-2-instance-1"]').should('exist')
            cy.get('[data-el="instances-table"] [data-el="row-application-3-instance-1"]').should('exist')
            cy.get('[data-el="instances-table"] [data-el="row-application-4-instance-1"]').should('exist')
            // application 5 should not be visible to anyone
            cy.get('[data-el="instances-table"] [data-el="row-application-5-instance-1"]').should('not.exist')
            cy.get('[data-el="instances-table"] [data-el="row-application-6-instance-1"]').should('exist')
        })
    })
})
