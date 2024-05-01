import multipleBlueprints from '../../fixtures/blueprints/multiple-blueprints.json'
import listingLibraryItems from '../../fixtures/libraries/listing-library-items.json'
import sharedLibrary from '../../fixtures/libraries/shared-library.json'

function interceptBlueprints (blueprints = []) {
    cy.intercept('/api/*/flow-blueprints?*', {
        meta: {},
        ...blueprints
    }).as('getBlueprints')
    cy.visit('team/ateam/library')
}

function interceptLibraries (libraries = [], metaType) {
    cy.intercept(
        '/storage/library/*',
        (req) => req.reply(res => {
            res.body = { ...res.body, ...libraries }
            res.headers['X-meta-type'] = metaType
            return res
        })
    ).as('getLibraries')

    cy.visit('team/ateam/library')
}

describe('FlowForge - Library', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    describe('Blueprints tab', () => {
        it('allows users to create new Blueprints if they don\'t have  any', () => {
            interceptBlueprints()

            cy.wait(['@getBlueprints'])

            cy.get('[data-cy="page-name"]').contains('Library')
            cy.contains('Shared repository to store common flows and nodes.')

            cy.contains('No Blueprints Available')

            cy.get('[data-el="go-to-blueprints"]').contains('Go To Blueprints').click()

            cy.window().then((win) => expect(win.location.href).to.contain('admin/flow-blueprints'))

            cy.get('[data-action="create-flow-blueprint"]').contains('Create Flow Blueprint')
            cy.contains('Flow Blueprints')
            cy.contains('Inactive Blueprints')
        })

        it('groups multiple blueprints by their category', () => {
            interceptBlueprints(multipleBlueprints)

            cy.get('[data-el="page-name"]').contains('Library')

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

        it('allows you to select a predefined blueprint and create an instance', () => {
            interceptBlueprints(multipleBlueprints)

            cy.get('[data-el="5678"]').contains('Select').click()

            cy.window().then((win) => expect(win.location.href).to.contain('instances/create'))

            cy.contains('Create Instance')
            cy.contains('Blueprint 2')
        })
    })

    describe('Team Library tab', () => {
        it('allows users to inspect existing Team Libraries ', () => {
            interceptLibraries([], 'folder')

            cy.get('[data-el="ff-tab"]').contains('Team Library').click()

            cy.wait(['@getLibraries'])

            cy.contains('Create your own Team Library')
            cy.contains('You can import and export flows and functions to a shared Team Library from within your Node-RED Instances.')
            cy.contains('The contents of your Team Library will show here, and will be available within all of your Node-RED instances on FlowFuse.')
            cy.get('[data-el="go-to-instances"]').contains('Go To Instance').as('createInstanceBtn').should('exist')
            cy.contains('You can see a video of how to get started with this feature here.')

            cy.get('@createInstanceBtn').click()
            cy.window().then((win) => expect(win.location.href).to.contain('/instances'))
        })

        it('allows users to create Team Libraries if they don\'t have any', () => {
            interceptLibraries(listingLibraryItems, 'folder')

            cy.get('[data-el="ff-tab"]').contains('Team Library').click()

            cy.wait(['@getLibraries'])

            cy.intercept('/storage/library/*/*', sharedLibrary).as('getLibrary')

            cy.get('[data-el="ff-data-cell"]').contains('First Team Library.json').click()

            cy.wait(['@getLibrary'])

            cy.contains('Copy to Clipboard')
            cy.get('[data-el="ff-code-previewer"]').should('exist')
            cy.contains('"id": "b9b294725f80b01c"')
            cy.contains('"id": "d040659cbe69d523"')
            cy.contains('"id": "e346197ad2873980"')
            cy.contains('"id": "423947de9c2b81cf"')
            cy.contains('"id": "45ee287d460c26db"')
            cy.contains('"id": "b3f4402b1661a42e"')
            cy.contains('"id": "d5a42eef34d39d76"')
        })
    })
})
