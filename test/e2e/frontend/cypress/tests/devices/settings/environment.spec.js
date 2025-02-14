describe('FlowForge - Device - Settings Environment', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
        cy.get('[data-el="devices-browser"] tbody [data-el="ff-data-cell"] a').first().click()
        cy.get('[data-nav="device-settings"]').click()
        cy.get('[data-nav="environment"]').click()
    })

    it('can add, remove mark as hidden instance environment variables', () => {
        cy.intercept('PUT', '/api/*/devices/*/settings').as('updateSettings')

        cy.get('[data-el="env-vars-table"]').should('exist')
        cy.get('[data-el="env-vars-table"]').should('be.visible')
        cy.get('[data-el="env-vars-table"] tbody tr').should('have.length', 5)

        cy.get('[data-el="submit"]').should('be.disabled')

        cy.get('[data-el="add-variable"]').click()

        cy.get('[data-el="submit"]').should('not.be.disabled')

        cy.get('[data-el="env-vars-table"] tbody tr').should('have.length', 6)

        // can remove an unsaved variable
        cy.get('[data-el="env-vars-table"] [data-row="row-NEW"]').within(() => {
            cy.get('[data-el="remove"]').click()
        })

        cy.get('[data-el="env-vars-table"] tbody tr').should('have.length', 5)

        // can add a visible environment variable
        cy.get('[data-el="add-variable"]').click()
        cy.get('[data-el="submit"]').should('not.be.disabled')

        cy.get('[data-el="env-vars-table"] [data-row="row-NEW"]').within(() => {
            cy.get('[data-el="visibility"]').should('exist')
            // filling in value first because changing the name will also change the selector
            cy.get('[data-el="var-value"]').type('value')
            cy.get('[data-el="var-name"]').type('new_var')
        })

        // can add a hidden environment variable
        cy.get('[data-el="add-variable"]').click()
        // previous entry changed name so new entry is the new row-NEW
        cy.get('[data-el="env-vars-table"] [data-row="row-NEW"]').within(() => {
            // filling in value first because changing the name will also change the selector
            cy.get('[data-el="var-value"]').type('secret')
            cy.get('[data-el="var-name"]').type('new_password')
        })

        cy.get('[data-el="env-vars-table"] [data-row="row-new_password"]').within(() => {
            cy.get('[data-el="visibility"]').click()
        })

        cy.get('[data-el="submit"]').click()
        cy.wait('@updateSettings')

        cy.get('[data-el="submit"]').should('be.disabled')

        // check that the hidden var name and visibility can't be changed
        cy.get('[data-el="env-vars-table"] [data-row="row-new_password"]').within(() => {
            cy.get('[data-el="var-name"] input').should('be.disabled')
            cy.get('[data-el="var-value"]').should('have.value', '')
            cy.get('[data-el="visibility"]').should('have.class', 'disabled')
        })

        // can mark an existing env var as hidden
        cy.get('[data-el="env-vars-table"] [data-row="row-new_var"]').within(() => {
            cy.get('[data-el="visibility"]').should('not.have.class', 'disabled')
            cy.get('[data-el="visibility"]').should('not.be.disabled')
            cy.get('[data-el="visibility"]').click()
        })
        cy.get('[data-el="submit"]').should('not.be.disabled')
        cy.get('[data-el="submit"]').click()
        cy.wait('@updateSettings')

        cy.get('[data-el="env-vars-table"] [data-row="row-new_var"]').within(() => {
            cy.get('[data-el="var-name"] input').should('be.disabled')
            cy.get('[data-el="var-value"]').should('be.empty')
            cy.get('[data-el="visibility"]').should('have.class', 'disabled')
        })

        // cleanup, can remove vars
        cy.get('[data-el="env-vars-table"] [data-row="row-new_var"] [data-el="remove"]').click()
        cy.get('[data-el="env-vars-table"] [data-row="row-new_password"] [data-el="remove"]').click()

        cy.get('[data-el="submit"]').should('not.be.disabled')

        cy.get('[data-el="submit"]').click()
        cy.wait('@updateSettings')

        cy.get('[data-el="submit"]').should('be.disabled')
    })
})
