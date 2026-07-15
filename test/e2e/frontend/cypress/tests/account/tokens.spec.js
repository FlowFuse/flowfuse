describe('FlowFuse - Personal Access Tokens', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/user/tokens').as('getPersonalAccessToken')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/account/security/tokens')
        cy.wait('@getPersonalAccessToken')
    })

    it('dialog has the correct default state', () => {
        cy.get('[data-el="add-token-dialog"]').should('not.be.visible')
        cy.get('[data-action="new-token"]').click()
        cy.get('[data-el="add-token-dialog"]').should('be.visible')

        // expiry unchecked and date field hidden by default
        cy.get('[data-form="expiry-toggle"] input').should('not.be.checked')
        cy.get('[data-form="token-expiry"]').should('not.exist')

        // read-only unchecked by default
        cy.get('[data-form="readonly-toggle"] input').should('not.be.checked')

        // admin opt-in unchecked by default (alice is admin so it should be visible)
        cy.get('[data-form="admin-optin-toggle"] input').should('not.be.checked')

        // team scope warning visible when no teams selected
        cy.contains('This token will have access to all teams you belong to').should('be.visible')

        cy.get('[data-el="add-token-dialog"]').within(() => {
            // check primary is disabled by default
            cy.get('[data-action="dialog-confirm"]').contains('Create')
            cy.get('[data-action="dialog-confirm"]').should('be.disabled')

            // close the dialog
            cy.get('[data-action="dialog-cancel"]').contains('Cancel')
            cy.get('[data-action="dialog-cancel"]').click()
        })

        cy.get('[data-el="add-token-dialog"]').should('not.be.visible')
    })

    it('expiry date field appears when expiry is toggled on', () => {
        cy.get('[data-action="new-token"]').click()

        // date field should not exist initially
        cy.get('[data-form="token-expiry"]').should('not.exist')

        // toggle expiry on
        cy.get('[data-form="expiry-toggle"]').click()
        cy.get('[data-form="token-expiry"]').should('exist')
        cy.get('[data-form="token-expiry"] input').should('not.be.disabled')

        // toggle expiry off
        cy.get('[data-form="expiry-toggle"]').click()
        cy.get('[data-form="token-expiry"]').should('not.exist')
    })

    it('can be added without an expiry', () => {
        const TOKEN_NAME = 'Token 1'
        // count how many tokens we already have
        const rows = Cypress.$('[data-el="tokens-table"] tbody').find('tr.ff-data-table--row').length

        cy.intercept('POST', '/api/*/user/tokens').as('addPersonalAccessToken')

        cy.get('[data-action="new-token"]').click()

        // expiry disabled by default
        cy.get('[data-form="token-name"] input').type(TOKEN_NAME)

        cy.get('[data-el="add-token-dialog"]').within(() => {
            // check primary is no longer disabled
            cy.get('[data-action="dialog-confirm"]').contains('Create')
            cy.get('[data-action="dialog-confirm"]').should('not.be.disabled')
            cy.get('[data-action="dialog-confirm"]').click()
        })

        cy.wait('@addPersonalAccessToken')

        cy.get('[data-el="add-token-confirmation"]').should('be.visible')
        cy.get('[data-el="add-token-confirmation"] [data-action="token-confirmation-done"]').click()

        // check we have one more token than before
        cy.get('[data-el="tokens-table"] tbody').find('tr').should('have.length', rows + 1)
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().should('contain', TOKEN_NAME)
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().should('contain', 'Never')
    })

    it('can be added with an expiry date', () => {
        // count how many tokens we already have
        const rows = Cypress.$('[data-el="tokens-table"] tbody').find('tr.ff-data-table--row').length

        cy.intercept('POST', '/api/*/user/tokens').as('addPersonalAccessToken')

        cy.get('[data-action="new-token"]').click()

        cy.get('[data-form="token-name"] input').type('Token 2')
        cy.get('[data-form="expiry-toggle"]').click()
        cy.get('[data-form="token-expiry"] input').should('not.be.disabled')
        cy.get('[data-form="token-expiry"] input').type('2050-12-31')

        // check primary is no longer disabled
        cy.get('[data-action="dialog-confirm"]').contains('Create').should('not.be.disabled')
        cy.get('[data-action="dialog-confirm"]').contains('Create').click()

        cy.wait('@addPersonalAccessToken')

        cy.get('[data-el="add-token-confirmation"]').should('be.visible')
        cy.get('[data-el="add-token-confirmation"] [data-action="token-confirmation-done"]').click()

        // check we have one more token than before
        cy.get('[data-el="tokens-table"] tbody').find('tr').should('have.length', rows + 1)
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().should('contain', '31')
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().should('contain', '12')
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().should('contain', '2050')
    })

    it('can be added with read-only enabled', () => {
        cy.intercept('POST', '/api/*/user/tokens').as('addPersonalAccessToken')

        cy.get('[data-action="new-token"]').click()
        cy.get('[data-form="token-name"] input').type('ReadOnly Token')
        cy.get('[data-form="readonly-toggle"]').click()

        cy.get('[data-el="add-token-dialog"] [data-action="dialog-confirm"]').click()

        cy.wait('@addPersonalAccessToken').its('request.body').should('have.property', 'readOnly', true)

        cy.get('[data-el="add-token-confirmation"]').should('be.visible')
        cy.get('[data-el="add-token-confirmation"] [data-action="token-confirmation-done"]').click()

        // token list should show Read Only badge
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().should('contain', 'Read Only')
    })

    it('can be added with team scope', () => {
        cy.intercept('POST', '/api/*/user/tokens').as('addPersonalAccessToken')

        cy.get('[data-action="new-token"]').click()
        cy.get('[data-form="token-name"] input').type('Team Scoped Token')

        // select the first team
        cy.get('[data-form^="team-scope-"]').first().click()

        // warning should disappear when a team is selected
        cy.contains('This token will have access to all teams you belong to').should('not.exist')

        cy.get('[data-el="add-token-dialog"] [data-action="dialog-confirm"]').click()

        cy.wait('@addPersonalAccessToken').its('request.body').should('have.property', 'teamIds')

        cy.get('[data-el="add-token-confirmation"]').should('be.visible')
        cy.get('[data-el="add-token-confirmation"] [data-action="token-confirmation-done"]').click()

        // token list should show Team Scoped
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().should('contain', 'Team Scoped')
    })

    it('can be added with admin opt-in', () => {
        cy.intercept('POST', '/api/*/user/tokens').as('addPersonalAccessToken')

        cy.get('[data-action="new-token"]').click()
        cy.get('[data-form="token-name"] input').type('Admin Token')
        cy.get('[data-form="admin-optin-toggle"]').click()

        cy.get('[data-el="add-token-dialog"] [data-action="dialog-confirm"]').click()

        cy.wait('@addPersonalAccessToken').its('request.body').should('have.property', 'adminOptIn', true)

        cy.get('[data-el="add-token-confirmation"]').should('be.visible')
        cy.get('[data-el="add-token-confirmation"] [data-action="token-confirmation-done"]').click()
    })

    it('token list shows All Teams for unscoped tokens', () => {
        cy.get('[data-el="tokens-table"] tbody').find('tr').first().should('contain', 'All Teams')
    })

    it('can be removed', () => {
        // count how many tokens we already have
        const rows = Cypress.$('[data-el="tokens-table"] tbody').find('tr.ff-data-table--row').length

        cy.intercept('DELETE', '/api/*/user/tokens/*').as('removePersonalAccessToken')

        // open kebab menu
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().find('td').last().click()
        // delete the token
        cy.get('[data-action="delete-token"]').click()

        cy.wait('@removePersonalAccessToken')

        // check we have one less token than before
        cy.get('[data-el="tokens-table"] tbody').find('tr').should('have.length', rows - 1)
    })
})
