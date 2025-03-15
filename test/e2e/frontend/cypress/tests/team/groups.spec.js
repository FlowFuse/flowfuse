describe('FlowForge - Groups', () => {
    describe('Teams with the groups feature disabled', () => {
        it('should have the groups menu entry in the sidebar and display the feature banner', () => {
            cy.login('bob', 'bbPassword')
            cy.home()

            // check for menu entry
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"]').should('exist')
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"]').should('be.visible')

            // check for premium feature marking
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"] [data-el="premium-feature"]').should('exist')
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"] [data-el="premium-feature"]').should('be.visible')

            cy.get('[data-el="left-drawer"] [data-nav="device-groups"]').click()

            cy.url().should('include', '/groups')

            cy.get('[data-cy="page-name"]').should('contain', 'Groups')
            cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('be.visible')
            cy.get('[data-el="empty-state"]').should('be.visible')
            cy.get('[data-el="empty-state"]').should('contain', 'Groups Not Available')

            cy.get('[data-action="create-device-group"]').should('not.exist')
        })
    })

    describe('Teams with the groups feature enabled', () => {
        beforeEach(() => {
            cy.intercept('/api/*/teams/*', (req) => {
                req.reply((response) => {
                    response.body.type.properties.features.deviceGroups = true
                    return response
                })
            }).as('enableTeamGroups')

            cy.login('bob', 'bbPassword')
            cy.home()
            cy.wait('@enableTeamGroups')
        })

        it('should have the groups menu entry in the sidebar and display an empty state message', () => {
            // check for menu entry
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"]').should('exist')
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"]').should('be.visible')

            // check for premium feature marking
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"] [data-el="premium-feature"]').should('not.exist')

            cy.get('[data-el="left-drawer"] [data-nav="device-groups"]').click()

            cy.url().should('include', '/groups')

            cy.get('[data-el="empty-state"]').should('be.visible')
            cy.get('[data-el="empty-state"]').should('contain', 'Start building your Groups')
            cy.get('[data-el="empty-state"] [data-action="create-device-group"]').should('exist')
            cy.get('[data-el="empty-state"] [data-action="create-device-group"]').should('be.enabled')
        })

        it('should allow users to create groups when they don\'t have any', () => {
            cy.intercept('POST', '/api/*/applications/*/device-groups', {
                description: '',
                name: 'A new group'
            }).as('createGroup')
            cy.intercept('GET', '/api/*/teams/*/device-groups', {
                meta: {},
                count: 0,
                groups: []
            })
                .as('getGroups')
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"]').click()

            cy.get('[data-dialog="create-group"]').should('exist')
            cy.get('[data-dialog="create-group"]').should('not.be.visible')

            cy.get('[data-el="empty-state"] [data-action="create-device-group"]').should('exist')
            cy.get('[data-el="empty-state"] [data-action="create-device-group"]').should('be.enabled')

            cy.get('[data-el="empty-state"] [data-action="create-device-group"]').click()

            cy.get('[data-dialog="create-group"]').should('be.visible')
            cy.get('[data-dialog="create-group"]').within(() => {
                cy.get('[data-el="applications-list"]').click()
                cy.get('[data-el="applications-list"]').within(() => {
                    cy.get('[data-option="application-1"]').click()
                })
                cy.get('[data-form="name"] input').type('A new group')
                cy.get('[data-action="dialog-confirm"]').click()
            })

            cy.wait('@createGroup')
            cy.wait('@getGroups')
        })

        it('should display the groups list table when groups are present', () => {
            cy.intercept('GET', '/api/*/teams/*/device-groups', {
                meta: {},
                count: 0,
                groups: [{
                    id: 'id',
                    name: 'a group',
                    description: 'group description',
                    deviceCount: 2,
                    targetSnapshot: null,
                    application: {
                        id: 'id',
                        name: 'application-1'
                    }
                }]
            }).as('getGroups')
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"]').click()

            cy.wait('@getGroups')

            cy.get('[data-el="empty-state"]').should('not.exist')
            cy.get('[data-el="device-groups-table"]').should('exist')
            cy.get('[data-el="device-groups-table"]').should('be.visible')

            cy.get('[data-el="device-groups-table"] tbody tr').should('have.length', 1)
            cy.get('[data-el="device-groups-table"] tbody tr').should('contain', 'a group')
            cy.get('[data-el="device-groups-table"] tbody tr').should('contain', 'application-1')
            cy.get('[data-el="device-groups-table"] tbody tr').should('contain', 'group description')
            cy.get('[data-el="device-groups-table"] tbody tr').should('contain', '2')
        })

        it('should allow users to create groups when they already have some', () => {
            cy.intercept('GET', '/api/*/teams/*/device-groups', {
                meta: {},
                count: 0,
                groups: [{
                    id: 'id',
                    name: 'a group',
                    description: 'group description',
                    deviceCount: 2,
                    targetSnapshot: null,
                    application: {
                        id: 'id',
                        name: 'application-1'
                    }
                }]
            }).as('getGroups')
            cy.intercept('POST', '/api/*/applications/*/device-groups', {
                description: '',
                name: 'A new group'
            }).as('createGroup')
            cy.get('[data-el="left-drawer"] [data-nav="device-groups"]').click()

            cy.wait('@getGroups')

            cy.get('[data-dialog="create-group"]').should('exist')
            cy.get('[data-dialog="create-group"]').should('not.be.visible')

            cy.get('[data-el="device-groups-table"] [data-action="create-device-group"]').should('exist')
            cy.get('[data-el="device-groups-table"] [data-action="create-device-group"]').should('be.enabled')

            cy.get('[data-el="device-groups-table"] [data-action="create-device-group"]').click()

            cy.get('[data-dialog="create-group"]').should('be.visible')
            cy.get('[data-dialog="create-group"]').within(() => {
                cy.get('[data-el="applications-list"]').click()
                cy.get('[data-el="applications-list"]').within(() => {
                    cy.get('[data-option="application-1"]').click()
                })
                cy.get('[data-form="name"] input').type('A new group')
                cy.get('[data-action="dialog-confirm"]').click()
            })

            cy.wait('@createGroup')
            cy.wait('@getGroups')
        })
    })
})
