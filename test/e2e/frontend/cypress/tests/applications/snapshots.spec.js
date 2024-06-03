/// <reference types="cypress" />

import deviceSnapshots from '../../fixtures/snapshots/device-snapshots.json'
import deviceFullSnapshot from '../../fixtures/snapshots/device2-full-snapshot1.json'
import instanceSnapshots from '../../fixtures/snapshots/instance-snapshots.json'
import instanceFullSnapshot from '../../fixtures/snapshots/instance2-full-snapshot2.json'
const snapshots = {
    count: 2,
    snapshots: [deviceSnapshots.snapshots[0], instanceSnapshots.snapshots[0]]
}
const emptySnapshots = {
    count: 0,
    snapshots: []
}

const IDX_VIEW_SNAPSHOT = 0
const IDX_COMPARE_SNAPSHOT = 1
const IDX_DOWNLOAD_SNAPSHOT = 2
const IDX_DOWNLOAD_PACKAGE = 3
const IDX_DELETE_SNAPSHOT = 4

describe('FlowForge - Application - Snapshots', () => {
    let application
    function navigateToApplication (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                application = response.body.applications.find(
                    (app) => app.name === projectName
                )
                cy.visit(`/application/${application.id}/instances`)
                cy.wait('@getApplication')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.login('bob', 'bbPassword')
        cy.home()
        navigateToApplication('BTeam', 'application-2')
    })

    it('can navigate to the /snapshots page', () => {
        cy.visit(`/application/${application.id}`)
        cy.get('[data-nav="application-snapshots"]').should('exist').click()

        cy.url().should('include', `/application/${application.id}/snapshots`)
    })

    it('empty state informs users they need to add snapshots', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', emptySnapshots).as('getSnapshots')

        cy.get('[data-nav="application-snapshots"]').click()

        cy.get('[data-el="empty-state"]').contains('What are Snapshots')
    })

    it('offers correct options in snapshot table kebab menu', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')

        cy.get('[data-nav="application-snapshots"]').click()

        // click kebab menu in row 1 - a device snapshot
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()

        // check the options are present
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').should('have.length', 4)
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).contains('Compare Snapshot...')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot')
        // close the kebab menu by clicking the table
        cy.get('[data-el="snapshots"]').click()

        // click kebab menu in row 2 - a instance snapshot
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(1).click()
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).contains('Compare Snapshot...')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot')
    })

    it('provides functionality to view a device snapshot', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', deviceFullSnapshot).as('fullSnapshot')

        cy.get('[data-nav="application-snapshots"]').click()

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the View Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).click()

        cy.wait('@fullSnapshot')

        // check the snapshot dialog is visible and contains the snapshot name
        cy.get('[data-el="dialog-view-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-header').contains(deviceFullSnapshot.name)
        // check an SVG in present the content section
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-content svg').should('exist')
    })

    it('provides functionality to view an instance snapshot', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', instanceFullSnapshot).as('fullSnapshot')

        cy.get('[data-nav="application-snapshots"]').click()

        // click kebab menu in row 2
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(1).click()
        // click the View Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).click()

        cy.wait('@fullSnapshot')

        // check the snapshot dialog is visible and contains the snapshot name
        cy.get('[data-el="dialog-view-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-header').contains(instanceFullSnapshot.name)
        // check an SVG in present the content section
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-content svg').should('exist')
    })

    it('provides functionality to compare snapshots', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', instanceFullSnapshot).as('fullSnapshot')

        cy.get('[data-nav="application-snapshots"]').click()

        // click kebab menu in row 2
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(1).click()
        // click the View Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).click()

        cy.wait('@fullSnapshot')

        // check the snapshot dialog is visible and contains the snapshot name
        cy.get('[data-el="dialog-compare-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-compare-snapshot"] .ff-dialog-header').contains(instanceFullSnapshot.name)

        // initially, the compare button should be disabled
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] [data-action="compare-snapshots"]').should('be.disabled')

        // select a comparison snapshot
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] .ff-dropdown[disabled=false]').click()
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] .ff-dropdown-options > .ff-dropdown-option:first').click()
        // click compare button
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] [data-action="compare-snapshots"]').click()
        cy.wait('@fullSnapshot')

        // check an SVG in present the content section
        cy.get('[data-el="dialog-compare-snapshot"] .ff-dialog-content svg').should('exist')
    })
})
