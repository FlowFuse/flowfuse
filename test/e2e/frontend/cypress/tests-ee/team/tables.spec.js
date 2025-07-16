describe('FlowFuse - Tables', () => {
    describe('With platform settings disabled', () => {
        it('should not display the menu entry and the page should redirect back to the homepage', () => {
            cy.intercept('GET', '/api/*/settings', (req) => {
                req.reply((res) => {
                    res.body.features = {
                        ...res.body.features,
                        tables: false
                    }
                    return res
                })
            })

            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-tables"]').should('not.exist')

            cy.visit('/team/ateam/tables')

            cy.url().should('contain', 'team/ateam/overview')
        })
    })

    describe('With platform settings enabled', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/settings', (req) => {
                req.reply((res) => {
                    res.body.features = {
                        ...res.body.features,
                        tables: true
                    }
                    return res
                })
            })
        })

        describe('without the team setting enabled', () => {
            beforeEach(() => {
                cy.intercept('GET', '/api/*/teams/*', (req) => {
                    req.reply((res) => {
                        res.body.type.properties.features.tables = false
                        return res
                    })
                })
            })

            it('should display the menu entry and the page should have the missing feature banner', () => {
                cy.login('alice', 'aaPassword')
                cy.home()

                cy.get('[data-nav="team-tables"]').should('exist')
                cy.get('[data-nav="team-tables"] [data-el="premium-feature"]').should('exist')
                cy.get('[data-nav="team-tables"]').click()

                cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('exist')
                cy.get('[data-el="empty-state"]').should('exist')
                cy.get('[data-el="empty-state"]').should('contain', 'Tables are not available!')
            })
        })

        describe('with the team setting enabled', () => {
            beforeEach(() => {
                cy.intercept('GET', '/api/*/teams/*', (req) => {
                    req.reply((res) => {
                        res.body.type.properties.features.tables = true
                        return res
                    })
                })
            })

            it('should display the menu entry and the page prompt for the creation of a database', () => {
                cy.intercept('GET', '/api/*/teams/*/databases', {
                    body: [],
                    response: 200
                })

                cy.login('alice', 'aaPassword')
                cy.home()

                cy.get('[data-nav="team-tables"]').should('exist')
                cy.get('[data-nav="team-tables"] [data-el="premium-feature"]').should('not.exist')
                cy.get('[data-nav="team-tables"]').click()

                cy.contains('Choose which Database you\'d like to get started with:')

                cy.get('[data-el="medium-tile"][data-value="Managed PostgreSQL"]').should('exist')
                cy.get('[data-el="page-back"]').should('exist')
            })

            // this test will run successfully only once per instance because we're actually creating a database and can't delete it yet
            it('should allow a user to create a managed postgres database if one does not exist', () => {
                cy.login('alice', 'aaPassword')

                // ensures we don't have any tables from the db stub so we can check for empty state messages
                cy.intercept('GET', '/api/*/teams/*/databases/*/tables', {
                    body: [],
                    response: 200
                })

                cy.visit('/team/ateam/tables')

                cy.get('[data-el="medium-tile"][data-value="Managed PostgreSQL"] [data-el="select"]').click()

                cy.get('[data-input="name"] input').type('Data the Base')
                //
                cy.get('[data-action="submit"]').click()

                cy.get('[data-el="table-explorer"]').should('exist')

                cy.get('[data-el="table-explorer"] [data-el="tables-list"] .empty-state').should('exist')
                cy.get('[data-el="table-explorer"] [data-el="rows-list"] .no-content').should('exist')
            })
        })
    })
})
