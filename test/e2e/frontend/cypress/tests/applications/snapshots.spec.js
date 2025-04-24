/// <reference types="cypress" />

import deviceSnapshots from '../../fixtures/version-history/snapshots/device-snapshots.json'
import deviceFullSnapshot from '../../fixtures/version-history/snapshots/device2-full-snapshot1.json'
import instanceSnapshots from '../../fixtures/version-history/snapshots/instance-snapshots.json'
import instanceFullSnapshot from '../../fixtures/version-history/snapshots/instance2-full-snapshot2.json'
const snapshots = {
    count: 2,
    snapshots: [deviceSnapshots.snapshots[0], instanceSnapshots.snapshots[0]]
}
const emptySnapshots = {
    count: 0,
    snapshots: []
}
let idx = 0
const IDX_EDIT_SNAPSHOT = idx++
const IDX_VIEW_SNAPSHOT = idx++
const IDX_COMPARE_SNAPSHOT = idx++
const IDX_DOWNLOAD_SNAPSHOT = idx++
const IDX_DOWNLOAD_PACKAGE = idx++
const IDX_DELETE_SNAPSHOT = idx++

const MENU_ITEM_COUNT = idx

describe('FlowForge - Application - Snapshots', () => {
    let application
    let team
    function navigateToApplication (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                application = response.body.applications.find(
                    (app) => app.name === projectName
                )
                cy.visit(`/team/${team.slug}/applications/${application.id}/instances`)
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
        cy.visit(`/team/${team.slug}/applications/${application.id}`)
        cy.get('[data-nav="application-snapshots"]').should('exist').click()

        cy.url().should('include', `/applications/${application.id}/snapshots`)
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
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').should('have.length', MENU_ITEM_COUNT)
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_EDIT_SNAPSHOT).contains('Edit Snapshot')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).contains('Compare Snapshot...')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot')
        // close the kebab menu by clicking the table
        cy.get('[data-el="snapshots"]').click()

        // click kebab menu in row 2 - a instance snapshot
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(1).click()
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_EDIT_SNAPSHOT).contains('Edit Snapshot')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).contains('Compare Snapshot...')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot')
    })

    it('provides functionality to view a device snapshot', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', deviceFullSnapshot).as('fullSnapshot')

        cy.get('[data-nav="application-snapshots"]').click()

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the View Snapshot option
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).click()

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
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).click()

        cy.wait('@fullSnapshot')

        // check the snapshot dialog is visible and contains the snapshot name
        cy.get('[data-el="dialog-view-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-header').contains(instanceFullSnapshot.name)
        // check an SVG in present the content section
        cy.get('[data-el="dialog-view-snapshot"] .ff-dialog-content svg').should('exist')
    })

    it('provides functionality to edit a snapshot', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', instanceFullSnapshot).as('fullSnapshot')
        cy.intercept('PUT', '/api/*/snapshots/*', {}).as('updateSnapshot')

        cy.get('[data-nav="application-snapshots"]').click()

        // click kebab menu in row 2
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(1).click()
        // click the Edit Snapshot option
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_EDIT_SNAPSHOT).click()

        // check the snapshot dialog is visible and contains the snapshot name
        cy.get('[data-el="dialog-edit-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-edit-snapshot"] .ff-dialog-header').contains(instanceFullSnapshot.name)
        // check the edit form is present
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-edit"]').should('exist')
        // check the buttons are present
        cy.get('[data-el="dialog-edit-snapshot"] [data-action="dialog-confirm"]').should('exist').should('be.enabled')
        cy.get('[data-el="dialog-edit-snapshot"] [data-action="dialog-cancel"]').should('exist').should('be.enabled')

        // clear the snapshot name
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-name"] input').clear()
        // the confirm button should be disabled
        cy.get('[data-el="dialog-edit-snapshot"] [data-action="dialog-confirm"]').should('be.disabled')

        // enter a new snapshot name and description
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-name"] input').type('Edited Snapshot Name!!!')
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-description"] textarea').clear()
        cy.get('[data-el="dialog-edit-snapshot"] [data-form="snapshot-description"] textarea').type('Edited Snapshot Description!!!')
        // the confirm button should be enabled
        cy.get('[data-el="dialog-edit-snapshot"] [data-action="dialog-confirm"]').should('be.enabled').click()

        cy.wait('@updateSnapshot').then((interception) => {
            expect(interception.request.body.name).to.equal('Edited Snapshot Name!!!')
            expect(interception.request.body.description).to.equal('Edited Snapshot Description!!!')
        })

        // check the snapshot name is updated in the table
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('Edited Snapshot Name!!!')
    })

    it('provides functionality to compare snapshots', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', instanceFullSnapshot).as('fullSnapshot')

        cy.get('[data-nav="application-snapshots"]').click()

        // click kebab menu in row 2
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(1).click()
        // click the View Snapshot option
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).click()

        cy.wait('@fullSnapshot')

        // check the snapshot dialog is visible and contains the snapshot name
        cy.get('[data-el="dialog-compare-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-compare-snapshot"] .ff-dialog-header').contains(instanceFullSnapshot.name)

        // initially, the compare button should be disabled
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] [data-action="compare-snapshots"]').should('be.disabled')

        // select a comparison snapshot
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"]').click()
        cy.get('[data-el="listbox-options"] > .ff-option:first').click()
        // click compare button
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] [data-action="compare-snapshots"]').click()
        cy.wait('@fullSnapshot')

        // check an SVG in present the content section
        cy.get('[data-el="dialog-compare-snapshot"] .ff-dialog-content svg').should('exist')
    })
    it('download snapshot package.json', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', deviceSnapshots).as('snapshotData')
        cy.intercept('GET', '/api/*/snapshots/*').as('snapshot')

        cy.get('[data-nav="application-snapshots"]').click()

        // ensure package.json does not exist in the downloads folder before the test
        cy.task('clearDownloads')
        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the Download Package.json option
        cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).click()

        cy.wait('@snapshot').then(async interception => {
            // At this point, the endpoint has returned but occasionally, the test fails as the file is not yet written to the filesystem.
            // To counter this, there is a short 250ms wait to allow time for the file to be written to the filesystem.
            // A better solution would be to use a cy.command (named waitForFileDownload) that polls the downloads folder
            // and calls `cy.wait` with timeout and retry. This would allow the test to wait for the file in a more reliable way.
            // For now, a small delay here gets the job done.
            cy.wait(250) // eslint-disable-line cypress/no-unnecessary-waiting
            const downloadsFolder = Cypress.config('downloadsFolder')
            return cy.readFile(`${downloadsFolder}/package.json`)
        }).then((packageObject) => {
            expect(packageObject).to.have.property('name', 'instance-2-with-devices')
            expect(packageObject).to.have.property('description')
            expect(packageObject).to.have.property('dependencies')
            // expect(packageObject.dependencies).to.have.property('node-red', '4.0.0')
            // expect(packageObject.dependencies).to.have.property('@flowfuse/nr-project-nodes', '0.6.4')
            // expect(packageObject.dependencies).to.have.property('@flowfuse/node-red-dashboard', '*')
        })
    })
})
