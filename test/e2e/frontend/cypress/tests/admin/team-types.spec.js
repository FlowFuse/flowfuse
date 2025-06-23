describe('FlowForge - Instance Types', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
        cy.intercept('GET', '/api/*/team-types*').as('getTeamTypes')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/team-types')
        cy.wait('@getTeamTypes')
    })

    it('can successfully create a team type', () => {
        cy.intercept('POST', '/api/*/team-types').as('postTeamTypes')

        cy.get('[data-el="team-type-dialog"]').should('not.be.visible')

        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').its('length').then((activeTypes) => {
            cy.get('[data-action="create-type"]').should('exist')
            cy.get('[data-action="create-type"]').click()
            cy.get('[data-el="team-type-dialog"]').should('exist')

            cy.get('[data-form="name"] input[type="text"]').type('New Team Type')
            cy.get('[data-form="description"] textarea').type('Description goes here')

            cy.get('[data-el="team-type-dialog"] button.ff-btn.ff-btn--primary').click()

            cy.wait('@postTeamTypes')

            cy.get('[data-el="team-type-dialog"]').should('not.be.visible')

            cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').should('have.length', activeTypes + 1)
        })
    })

    it('can successfully set an team type as inactive', () => {
        cy.intercept('PUT', '/api/*/team-types/*').as('updateTeamType')

        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').its('length').then((activeTypes) => {
            // should have "No Data" row
            cy.get('[data-el="inactive-types"] tbody').find('tr').should('have.length', 1)
            cy.get('[data-el="inactive-types"] tbody').contains('td', 'No Data Found')

            cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').eq(1).find('.ff-tile-selection-option--edit').click()

            cy.get('[data-el="team-type-dialog"]').should('be.visible')

            // set as inactive
            cy.get('[data-form="active"] span.checkbox').click()
            // confirm changes
            cy.get('[data-el="team-type-dialog"] button.ff-btn.ff-btn--primary').click()

            cy.wait('@updateTeamType')

            // one active stacks
            cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').should('have.length', activeTypes - 1)

            // one inactive stacks
            cy.get('[data-el="inactive-types"] tbody').find('tr').should('have.length', 1)
            cy.get('[data-el="inactive-types"] tbody').contains('td', 'New Team Type')
        })
    })

    it('can successfully delete an inactive instance type', () => {
        cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').its('length').then((activeTypes) => {
            cy.get('[data-el="inactive-types"] tbody .ff-kebab-menu').click()
            cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(1).click()

            // TODO: Adding local exception until our dialog boxes provide a data attr to use
            // eslint-disable-next-line cypress/require-data-selectors
            cy.get('.ff-dialog-box').should('be.visible')
            // eslint-disable-next-line cypress/require-data-selectors
            cy.get('.ff-dialog-box .ff-dialog-header').contains('Delete Team Type')

            // confirm delete
            // eslint-disable-next-line cypress/require-data-selectors
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--danger').click()

            // no change in active types
            cy.get('[data-el="active-types"]').find('.ff-tile-selection-option').should('have.length', activeTypes)

            // no inactive instance types
            cy.get('[data-el="inactive-types"] tbody').find('tr').should('have.length', 1) // no data found message
            cy.get('[data-el="inactive-types"] tbody').contains('td', 'No Data Found')
        })
    })
})
