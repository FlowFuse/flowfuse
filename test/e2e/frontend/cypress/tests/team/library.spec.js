import multipleBlueprints from '../../fixtures/blueprints/multiple-blueprints.json'

function interceptBlueprints (blueprints = []) {
    cy.intercept('/api/*/flow-blueprints?*', {
        meta: {},
        ...blueprints
    }).as('getBlueprints')
}

describe('FlowForge - Library', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    describe('Blueprints', () => {
        it('should load the Library page and display the unavailable feature banner for the Blueprints tab', () => {
            interceptBlueprints(multipleBlueprints)

            cy.visit('team/ateam/library')

            cy.get('[data-el="page-name"]').contains('Library')
            cy.get('[data-el="ff-tab"]').contains('Blueprints').click()

            cy.get('[data-el="category"]')
                .contains('Category A')
                .parent()
                .within(() => {
                    cy.get('[data-el="tiles-wrapper"]')
                        .children()
                        .should('have.length', 1)

                    cy.contains('Blueprint 1')
                    cy.contains('This is a blueprint')
                })

            cy.get('[data-el="category"]')
                .contains('Category B')
                .parent()
                .within(() => {
                    cy.get('[data-el="tiles-wrapper"]')
                        .children()
                        .should('have.length', 2)

                    cy.contains('Blueprint 2')
                    cy.contains('Blueprint 3')
                    cy.contains('This is another blueprint')
                    cy.contains('This is yet another blueprint')
                })
        })
    })
    describe('Team Library', () => {
        it('should load the Library page and display the unavailable feature banner for Team Library tab', () => {
            cy.visit('team/ateam/library')

            cy.contains('Create your own Team Library')
            cy.contains('This is a FlowFuse Enterprise feature. Please upgrade your instance of FlowFuse in order to use it.')
        })
    })
})
