describe('FlowForge Dialogs - Project Types', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/project-types')
    })

    it('can successfully create a project type', () => {
        cy.intercept('POST', '/api/*/project-types').as('postProjectType')

        cy.get('.ff-dialog-box').should('not.be.visible')

        cy.get('[data-el="active-types"]').find('ff-tile-selection-option').should('have.length', 0)

        cy.get('[data-action="create-type"]').should('exist')
        cy.get('[data-action="create-type"]').click()
        cy.get('.ff-dialog-box').should('exist')

        cy.get('[data-form="name"] input[type="text"]').type('New Project Type')
        cy.get('[data-form="description"] textarea').type('Description goes here')

        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').click()

        cy.wait('@postProjectType')

        cy.get('.ff-dialog-box').should('not.be.visible')

        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').should('have.length', 1)
    })

    it('can successfully set a project type as inactive', () => {
        cy.intercept('PUT', '/api/*/project-types/*').as('updateProjectType')

        cy.get('[data-el="inactive-types"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="inactive-types"] tbody').contains('td', 'No Data Found')

        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').first().find('.ff-tile-selection-option--edit').click()

        cy.get('.ff-dialog-box').should('be.visible')

        // set as inactive
        cy.get('[data-form="active"] input[type="checkbox"]').click()
        // confirm changes
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').click()

        cy.wait('@updateProjectType')

        // no active project stacks
        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').should('have.length', 0)

        // one inactive project stacks
        cy.get('[data-el="inactive-types"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="inactive-types"] tbody').contains('td', 'New Project Type')
        cy.get('[data-el="inactive-types"] tbody').contains('td', 'Description goes here')
    })

    it('can successfully delete an inactive project type', () => {
        cy.get('[data-el="inactive-types"] tbody .ff-kebab-menu').click()
        cy.get('[data-el="inactive-types"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(1).click()

        cy.get('.ff-dialog-box').should('be.visible')
        cy.get('.ff-dialog-header').contains('Delete Project Type')

        // confirm delete
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--danger').click()

        // no active project types
        cy.get('[data-el="active-types"]').find('ff-tile-selection-option').should('have.length', 0)
        // no inactive project types
        cy.get('[data-el="inactive-types"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="inactive-types"] tbody').contains('td', 'No Data Found')
    })
})
