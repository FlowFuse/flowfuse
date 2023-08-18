describe('FlowForge - Personal Access Tokens', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/user/pat').as('getPersonalAccessToken')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/account/security/tokens')
        cy.wait('@getPersonalAccessToken')
    })

    it('dialog has the correct default state', () => {
        cy.get('[data-el="add-token-dialog"]').should('not.be.visible')
        cy.get('[data-action="new-token"]').click()
        cy.get('[data-el="add-token-dialog"]').should('be.visible')

        // expiry disabled by default
        cy.get('[data-form="expiry-toggle"] input').should('not.be.checked')
        cy.get('[data-form="token-expiry"] input').should('be.disabled')

        // check primary is disabled by default
        cy.get('[data-action="dialog-confirm"]').contains('Create').should('be.disabled')

        // close the dialog
        cy.get('[data-action="dialog-cancel"]').contains('Cancel').click()
        cy.get('[data-el="add-token-dialog"]').should('not.be.visible')
    })

    it('can be added without an expiry', () => {
        const TOKEN_NAME = 'Token 1'
        // count how many tokens we already have
        const rows = Cypress.$('[data-el="tokens-table"] tbody').find('tr').length

        cy.intercept('POST', '/api/*/user/pat').as('addPersonalAccessToken')

        cy.get('[data-action="new-token"]').click()

        // expiry disabled by default
        cy.get('[data-form="token-name"] input').type(TOKEN_NAME)

        // check primary is no longer disabled
        cy.get('[data-action="dialog-confirm"]').contains('Create').should('not.be.disabled')
        cy.get('[data-action="dialog-confirm"]').contains('Create').click()

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
        const rows = Cypress.$('[data-el="tokens-table"] tbody').find('tr').length

        cy.intercept('POST', '/api/*/user/pat').as('addPersonalAccessToken')

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
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().should('contain', '31/12/2050')
    })

    it('can be removed', () => {
        // count how many tokens we already have
        const rows = Cypress.$('[data-el="tokens-table"] tbody').find('tr').length

        cy.intercept('DELETE', '/api/*/user/pat/*').as('removePersonalAccessToken')

        // open kebab menu
        cy.get('[data-el="tokens-table"] tbody').find('tr').last().find('td').last().click()
        // delete the token
        cy.get('[data-action="delete-token"]').click()

        cy.wait('@removePersonalAccessToken')

        // check we have one less token than before
        cy.get('[data-el="tokens-table"] tbody').find('tr').should('have.length', rows - 1)
    })
})
