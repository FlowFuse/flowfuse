describe('FlowForge - Project Types', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/project-types*').as('getProjectTypes')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/project-types')
        cy.wait('@getProjectTypes')
    })

    it('can successfully create a project type', () => {
        cy.intercept('POST', '/api/*/project-types').as('postProjectType')

        cy.get('.ff-dialog-box').should('not.be.visible')

        // we populate a project type on startup
        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').should('have.length', 1)

        cy.get('[data-action="create-type"]').should('exist')
        cy.get('[data-action="create-type"]').click()
        cy.get('.ff-dialog-box').should('exist')

        cy.get('[data-form="name"] input[type="text"]').type('New Project Type')
        cy.get('[data-form="description"] textarea').type('Description goes here')

        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').click()

        cy.wait('@postProjectType')

        cy.get('.ff-dialog-box').should('not.be.visible')

        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').should('have.length', 2)
    })

    it('can successfully set a project type as inactive', () => {
        cy.intercept('PUT', '/api/*/project-types/*').as('updateProjectType')

        // should have "No Data" row
        cy.get('[data-el="inactive-types"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="inactive-types"] tbody').contains('td', 'No Data Found')

        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').eq(0).find('.ff-tile-selection-option--edit').click()

        cy.get('.ff-dialog-box').should('be.visible')

        // set as inactive
        cy.get('[data-form="active"] span.checkbox').click()
        // confirm changes
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').click()

        cy.wait('@updateProjectType')

        // one active project stacks
        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').should('have.length', 1)

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

        // one active project types
        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').should('have.length', 1)
        // no inactive project types
        cy.get('[data-el="inactive-types"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="inactive-types"] tbody').contains('td', 'No Data Found')
    })
})

describe('FlowForge shows audit logs', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/**/audit-log').as('getAuditLog')

        cy.login('alice', 'aaPassword')
        cy.home()

        cy.visit('/admin/audit-log')
        cy.wait(['@getAuditLog'])
    })

    it('for when a new project type is created', () => {
        cy.get('.ff-audit-entry').contains('New Project Type Created')
    })

    it('for when a project type is updated', () => {
        cy.get('.ff-audit-entry').contains('Project Type Updated')
    })

    it('for when a project type is deleted', () => {
        cy.get('.ff-audit-entry').contains('Project Type Deleted')
    })
})
