import multipleBlueprints from '../../fixtures/blueprints/multiple-blueprints.json'
import listingLibraryItems from '../../fixtures/libraries/listing-library-items.json'
import npmPackages from '../../fixtures/libraries/npm-packages.json'
import sharedLibrary from '../../fixtures/libraries/shared-library.json'

function interceptBlueprints (blueprints = []) {
    cy.intercept('/api/*/flow-blueprints?*', {
        meta: {},
        ...blueprints
    }).as('getBlueprints')
    cy.visit('team/ateam/library')
}

function interceptNPMPackages (packages = []) {
    cy.intercept('/api/*/teams/*/npm/packages', {
        ...packages
    }).as('getNPMPackages')
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

function interceptFlowFile () {
    cy.intercept(
        '/storage/library/*/*.json',
        (req) => req.reply(res => {
            res.body = { ...res.body }
            res.headers['X-meta-type'] = 'flows'
            return res
        })
    ).as('getFlowJson')
}

describe('FlowForge - Library', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    describe('Blueprints tab', () => {
        it('allows users to create new Blueprints if they don\'t have  any', () => {
            interceptBlueprints()

            cy.get('[data-el="ff-tab"]').contains('Blueprints').click()
            cy.wait(['@getBlueprints'])

            cy.get('[data-cy="page-name"]').contains('Library')
            cy.contains('Common resources that are shared across all of your Team\'s Node-RED instances.')

            cy.contains('No Blueprints Available')

            cy.get('[data-el="go-to-blueprints"]').contains('Go To Blueprints').click()

            cy.window().then((win) => expect(win.location.href).to.contain('admin/flow-blueprints'))

            cy.get('[data-action="create-flow-blueprint"]').contains('Create Flow Blueprint')
            cy.contains('Flow Blueprints')
            cy.contains('Inactive Blueprints')
        })

        it('groups multiple blueprints by their category', () => {
            interceptBlueprints(multipleBlueprints)

            cy.get('[data-el="ff-tab"]').contains('Blueprints').click()
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

        it('allows users to select a predefined blueprint and create an instance', () => {
            interceptBlueprints(multipleBlueprints)

            cy.get('[data-el="ff-tab"]').contains('Blueprints').click()
            // use a blueprint (Blueprint 2)
            cy.get('[data-el="2"]').contains('Select').click()

            cy.window().then((win) => expect(win.location.href).to.contain('instances/create'))

            // move along the multi-step form
            cy.get('[data-el="application-item"]').first().click()
            cy.get('[data-el="next-step"]').click()

            // select instance type
            cy.get('[data-form="project-type"] [data-item="tile-selection-option"]').first().click()

            // select template
            cy.get('[data-group="templates"] [data-item="tile-selection-option"]').first().click()

            // select nr-version
            cy.get('[data-form="multi-step-form"] [data-el="listbox"]').click()
            cy.get('[data-option="stack 1"]').click()

            cy.get('[data-el="next-step"]').click()

            // check that the blueprint we selected tu use earlier is selected
            cy.get('[data-el="blueprint-tile"].active').contains('Blueprint 2')
        })

        it('allows users to preview predefined blueprints', () => {
            interceptBlueprints(multipleBlueprints)

            cy.get('[data-el="ff-tab"]').contains('Blueprints').click()
            cy.get('[data-el="flow-view-dialog"]').should('exist').should('not.be.visible')

            cy.get('[data-el="1"]').within(() => {
                cy.get('[data-action="show-blueprint"]').should('exist').should('be.visible').click()
                cy.get('[data-el="flow-view-dialog"]').should('be.visible')
                cy.get('[data-action="dialog-confirm"]').click()
                cy.get('[data-el="flow-view-dialog"]').should('exist').should('not.be.visible')
            })
            cy.get('[data-el="2"]').within(() => {
                cy.get('[data-action="show-blueprint"]').should('exist').should('be.visible').click()
                cy.get('[data-el="flow-view-dialog"]').should('be.visible')
                cy.get('[data-action="dialog-confirm"]').click()
                cy.get('[data-el="flow-view-dialog"]').should('exist').should('not.be.visible')
            })
            cy.get('[data-el="3"]').within(() => {
                cy.get('[data-action="show-blueprint"]').should('exist').should('be.visible').click()
                cy.get('[data-el="flow-view-dialog"]').should('be.visible')
                cy.get('[data-action="dialog-confirm"]').click()
                cy.get('[data-el="flow-view-dialog"]').should('exist').should('not.be.visible')
            })
        })
    })

    describe('Team Library tab', () => {
        it('allows users to inspect existing Team Libraries ', () => {
            interceptLibraries([], 'folder')

            cy.wait(['@getLibraries'])

            cy.contains('Create your own Team Library')
            cy.contains('You can import and export flows and functions to a shared Team Library from within your Node-RED Instances.')
            cy.contains('The contents of your Team Library will show here, and will be available within all of your Node-RED instances on FlowFuse.')
            cy.get('[data-el="go-to-instances"]').contains('Go To Instance').as('goToInstances').should('exist')
            cy.contains('You can see a video of how to get started with this feature here.')

            cy.get('@goToInstances').click()
            cy.window().then((win) => expect(win.location.href).to.contain('/instances'))
        })

        it('allows users to create Team Libraries if they don\'t have any', () => {
            interceptLibraries(listingLibraryItems, 'folder')

            cy.wait(['@getLibraries'])

            cy.intercept('/storage/library/*/*', sharedLibrary)

            interceptFlowFile()

            cy.get('[data-el="ff-data-cell"]').contains('First Team Library.json').click()

            cy.wait(['@getFlowJson'])

            cy.contains('Copy to Clipboard')
            cy.get('[data-el="ff-flow-previewer"]').should('exist')
        })
    })

    describe('Custom Nodes Tab', () => {
        it('provides a "RefresH" and "Publish" button when the feature is enabled', () => {
            interceptNPMPackages(npmPackages)
            cy.get('[data-el="ff-tab"]').contains('Custom Nodes').click()

            cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('not.exist')
            cy.get('[data-action="refresh-registry"]').should('exist')
            cy.get('[data-action="publish-package"]').should('exist')
            cy.get('[data-el="registry-count"]').contains('1 package')
        })
    })
})
