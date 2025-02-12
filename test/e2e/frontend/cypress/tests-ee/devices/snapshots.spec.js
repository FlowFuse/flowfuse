/// <reference types="cypress" />

import deviceSnapshots from '../../fixtures/version-history/snapshots/device-snapshots.json'
import deviceFullSnapshot from '../../fixtures/version-history/snapshots/device2-full-snapshot1.json'
import instanceSnapshots from '../../fixtures/version-history/snapshots/instance-snapshots.json'
const snapshots = {
    count: 2,
    snapshots: [deviceSnapshots.snapshots[0], instanceSnapshots.snapshots[0]]
}
let idx = 0
const IDX_DEPLOY_SNAPSHOT = idx++
const IDX_EDIT_SNAPSHOT = idx++
const IDX_VIEW_SNAPSHOT = idx++
const IDX_COMPARE_SNAPSHOT = idx++
const IDX_DOWNLOAD_SNAPSHOT = idx++
const IDX_DOWNLOAD_PACKAGE = idx++
const IDX_DELETE_SNAPSHOT = idx++

const MENU_ITEM_COUNT = idx

describe('FlowForge - Devices - With Billing', () => {
    beforeEach(() => {
        cy.enableBilling()
        cy.intercept('/api/*/settings', (req) => {
            req.reply((response) => {
                // ensure we keep billing enabled
                response.body.features.billing = true
                // fake MQTT connection
                response.body.features.deviceEditor = true
                return response
            })
        }).as('getSettings')

        cy.login('bob', 'bbPassword')

        cy.visit('/team/bteam/devices')
    })

    it('doesn\'t show a "Snapshots" tab for devices bound to an Instance', () => {
        cy.contains('span', 'assigned-device-a').click()
        cy.get('[data-nav="version-history"]').should('not.exist')
    })

    it('shows a "Snapshots" tab for unassigned devices', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-nav="version-history"]').should('exist')
    })

    it('empty state informs users they need to bind the Device to an Application for unassigned devices on the "Snapshot" tab', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-nav="version-history"]').click()
        cy.contains('A Remote Instance must first be assigned to an Application')
    })

    it('shows a "Snapshots" tab for devices bound to an Instance', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').should('exist')
    })

    it('empty state informs users they need to be in Developer Mode for Devices assigned to an Application on the "Snapshot" tab', () => {
        cy.intercept('api/*/applications/*/snapshots?deviceId=*', { count: 0, snapshots: [] }).as('getDeviceSnapshots')
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()
        cy.wait('@getDeviceSnapshots')
        cy.contains('A Remote Instance must be in Developer Mode and online to create a Snapshot.')
    })

    it('doesn\'t show any "Enterprise Feature Only" guidance if billing is enabled', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()
        cy.get('[data-el="page-banner-feature-unavailable"]').should('not.exist')
    })

    it('shows only Snapshots for this device by default', () => {
        cy.intercept('api/*/applications/*/snapshots?deviceId=*').as('getDeviceSnapshots')
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

        // depending on order of tests, there may or may not be snapshots
        // therefore the empty state may me present or the table may be present

        cy.wait('@getDeviceSnapshots')

        // eslint-disable-next-line cypress/require-data-selectors
        cy.get('body').then(($body) => {
            if ($body.find('[data-el="snapshots"]').length) {
                cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length.greaterThan', 0)
                // should not find any snapshots with text "instance-"
                cy.get('[data-el="snapshots"] tbody').find('tr').should('not.contain.text', 'instance-')
            } else {
                cy.contains('Create your First Snapshot') // empty state
            }
        })
    })

    it('allows for users to view all Snapshots for this Device from it\'s parent Application', () => {
        let snapshotCount = 3
        cy.intercept('/api/*/applications/*/snapshots', (req) => {
            req.reply((response) => {
                snapshotCount = response.body.count
                return response
            })
        }).as('getDeviceSnapshots')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

        cy.get('[data-form="device-only-snapshots"]').click()

        cy.wait('@getDeviceSnapshots').then(() => {
            cy.get('[data-el="empty-state"]').should('not.exist')
            cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length', snapshotCount)
        })
    })

    it('offers correct options in snapshot table kebab menu', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

        // check the view all snapshots option
        cy.get('[data-form="device-only-snapshots"]').click()
        cy.wait('@getSnapshots')

        // click kebab menu in row 1 - a device snapshot
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // check the options are present
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').should('have.length', MENU_ITEM_COUNT)
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DEPLOY_SNAPSHOT).contains('Restore Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_EDIT_SNAPSHOT).contains('Edit Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).contains('Compare Snapshot...')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot').and('not.have.class', 'disabled')
        // clear the kebab menu by clicking the table
        cy.get('[data-el="snapshots"]').click()

        // click kebab menu in row 2 - an instance snapshot
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(1).click()
        // click kebab menu in row 2 - an instance snapshot
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').should('have.length', MENU_ITEM_COUNT)
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DEPLOY_SNAPSHOT).contains('Restore Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_EDIT_SNAPSHOT).contains('Edit Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).contains('Compare Snapshot...')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).should('have.class', 'disabled')
    })

    it('provides functionality to view a snapshot', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', deviceSnapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', deviceFullSnapshot).as('fullSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

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

    it('provides functionality to edit a snapshot', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')
        cy.intercept('PUT', '/api/*/snapshots/*', {}).as('updateSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

        cy.wait('@getSnapshots')

        // click kebab menu in row 2
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(1).click()
        // click the Edit Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_EDIT_SNAPSHOT).click()

        // check the snapshot dialog is visible and contains the snapshot name
        cy.get('[data-el="dialog-edit-snapshot"]').should('be.visible')
        cy.get('[data-el="dialog-edit-snapshot"] .ff-dialog-header').contains('Edit Snapshot: ' + snapshots.snapshots[1].name)
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
        cy.intercept('GET', '/api/*/applications/*/snapshots*', deviceSnapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', deviceFullSnapshot).as('fullSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the View Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_COMPARE_SNAPSHOT).click()

        cy.wait('@fullSnapshot')

        // initially, the compare button should be disabled
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] [data-action="compare-snapshots"]').should('be.disabled')

        // select the snapshot to compare with
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"]').click()
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] .ff-options > .ff-option:first').click()
        // click compare button
        cy.get('[data-el="dialog-compare-snapshot"] [data-el="snapshot-compare-toolbar"] [data-action="compare-snapshots"]').click()
        cy.wait('@fullSnapshot')

        // check the flow renders an SVG in the content section
        cy.get('[data-el="dialog-compare-snapshot"] .ff-dialog-content svg').should('exist')
    })

    it('upload snapshot with credentials', () => {
        cy.fixture('version-history/snapshots/snapshot-with-credentials.json', null).as('snapshot')
        cy.intercept('POST', '/api/*/snapshots/import').as('importSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

        // click data-action="import-snapshot" to open the dialog
        cy.get('[data-el="empty-state"] [data-action="import-snapshot"]').click()

        cy.get('[data-el="dialog-import-snapshot"]').should('be.visible')

        // check the dialog header
        cy.get('[data-el="dialog-import-snapshot"] .ff-dialog-header').contains('Upload Snapshot')

        // upload the snapshot file that has credentials (the credentials secret field should become visible)
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="file"]').selectFile({ contents: '@snapshot' }, { force: true }) // force because the input is hidden

        // check file field input text is the filename
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="text"]').should('have.value', 'snapshot-with-credentials.json')
        // check name field is the name from within the snapshot file
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').should('have.value', 'application device snapshot 1')

        // check validation of name field
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').clear()
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] [data-el="form-row-error"]').should('contain.text', 'Name is required')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').type('uploaded snapshot1')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"]').should('not.contain', '[data-el="form-row-error"]')

        // check validation of secret field
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] input').type('bad secret')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"]').should('not.contain', '[data-el="form-row-error"]')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] input').clear()
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] [data-el="form-row-error"]').should('contain.text', 'Secret is required')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"] input').type('correct secret')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"]').should('not.contain', '[data-el="form-row-error"]')

        // set a description
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-description"] textarea').type('snapshot1 description')

        // click import button
        cy.get('[data-el="dialog-import-snapshot"] [data-action="dialog-confirm"]').click()

        cy.wait('@importSnapshot')

        // check the snapshot is now in the table
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('uploaded snapshot1')
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('snapshot1 description')
    })

    it('upload snapshot without credentials', () => {
        cy.fixture('version-history/snapshots/instance2-full-snapshot2.json', null).as('snapshot')
        cy.intercept('POST', '/api/*/snapshots/import').as('importSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

        // click data-action="import-snapshot" to open the dialog
        cy.get('[data-action="import-snapshot"]').click()

        cy.get('[data-el="dialog-import-snapshot"]').should('be.visible')

        // check the dialog header
        cy.get('[data-el="dialog-import-snapshot"] .ff-dialog-header').contains('Upload Snapshot')

        // upload the snapshot file that has credentials (the credentials secret field should become visible)
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="file"]').selectFile({ contents: '@snapshot' }, { force: true }) // force because the input is hidden

        // check file field input text is the filename
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-filename"] input[type="text"]').should('have.value', 'instance2-full-snapshot2.json')
        // check name field is the name from within the snapshot file
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').should('have.value', 'instance-2 snapshot-2')

        // check credentials secret field is not visible
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-secret"]').should('not.exist')

        // check validation of name field
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').clear()
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"]').find('[data-el="form-row-error"]').should('exist')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] [data-el="form-row-error"]').should('contain.text', 'Name is required')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"] input').type('uploaded snapshot2')
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-name"]').find('[data-el="form-row-error"]').should('not.exist')

        // set a description
        cy.get('[data-el="dialog-import-snapshot"] [data-form="import-snapshot-description"] textarea').type('snapshot2 description')

        // click import button
        cy.get('[data-el="dialog-import-snapshot"] [data-action="dialog-confirm"]').click()

        cy.wait('@importSnapshot')

        // check the snapshot is now in the table
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('uploaded snapshot2')
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('snapshot2 description')
    })
    it('Can rollback a snapshot', () => {
        // Premise: Ensure the rollback endpoint is available and callable
        // (NOTE: this is not testing the full mechanics of the rollback feature, only to prevent repeat regression. See #2032)
        cy.intercept('PUT', '/api/*/devices/*').as('rollbackSnapshot')

        cy.intercept('GET', '/api/*/applications/*/snapshots*', deviceSnapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', deviceFullSnapshot).as('fullSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()

        // click the Rollback Snapshot option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DEPLOY_SNAPSHOT).click()

        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] .ff-dialog-header').contains('Restore Snapshot to device')

        // find .ff-btn--danger with text "Confirm" and click it
        cy.get('[data-el="platform-dialog"] .ff-btn--danger').contains('Confirm').click()

        // check body sent to /api/*/devices/*
        cy.wait('@rollbackSnapshot').then(interception => {
            const body = interception.request.body
            expect(body).to.have.property('targetSnapshot')
            expect(body.targetSnapshot).to.be.a('string')
        })
    })
    it('download snapshot package.json', () => {
        cy.intercept('GET', '/api/*/projects/*/snapshots', deviceSnapshots).as('snapshotData')
        cy.intercept('GET', '/api/*/snapshots/*').as('snapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').click()

        // ensure package.json does not exist in the downloads folder before the test
        cy.task('clearDownloads')
        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the Download Package.json option
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).click()

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
            expect(packageObject).to.have.property('name', 'application-device-a')
            expect(packageObject).to.have.property('description')
            expect(packageObject).to.have.property('dependencies')
            expect(packageObject.dependencies).to.have.property('node-red')
            expect(packageObject.dependencies).to.have.property('@flowfuse/nr-project-nodes')
        })
    })
})
