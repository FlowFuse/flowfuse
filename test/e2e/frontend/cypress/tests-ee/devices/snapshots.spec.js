/// <reference types="cypress" />

import deviceSnapshots from '../../fixtures/snapshots/device-snapshots.json'
import deviceFullSnapshot from '../../fixtures/snapshots/device2-full-snapshot1.json'
import instanceSnapshots from '../../fixtures/snapshots/instance-snapshots.json'
const snapshots = {
    count: 2,
    snapshots: [deviceSnapshots.snapshots[0], instanceSnapshots.snapshots[0]]
}

const IDX_DEPLOY_SNAPSHOT = 0
const IDX_VIEW_SNAPSHOT = 1
const IDX_DOWNLOAD_SNAPSHOT = 2
const IDX_DOWNLOAD_PACKAGE = 3
const IDX_DELETE_SNAPSHOT = 4

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
        cy.get('[data-nav="device-snapshots"]').should('not.exist')
    })

    it('shows a "Snapshots" tab for unassigned devices', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-nav="device-snapshots"]').should('exist')
    })

    it('empty state informs users they need to bind the Device to an Application for unassigned devices on the "Snapshot" tab', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-nav="device-snapshots"]').click()
        cy.contains('A device must first be assigned to an Application')
    })

    it('shows a "Snapshots" tab for devices bound to an Instance', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').should('exist')
    })

    it('empty state informs users they need to be in Developer Mode for Devices assigned to an Application on the "Snapshot" tab', () => {
        cy.intercept('api/*/applications/*/snapshots?deviceId=*', { count: 0, snapshots: [] }).as('getDeviceSnapshots')
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()
        cy.wait('@getDeviceSnapshots')
        cy.contains('A device must be in developer mode and online to create a snapshot.')
    })

    it('doesn\'t show any "Premium Feature Only" guidance if billing is enabled', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()
        cy.get('[data-el="page-banner-feature-unavailable"]').should('not.exist')
    })

    it('shows only Snapshots for this device by default', () => {
        cy.intercept('api/*/applications/*/snapshots?deviceId=*').as('getDeviceSnapshots')
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()

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
        cy.get('[data-nav="device-snapshots"]').click()

        cy.get('[data-form="device-only-snapshots"]').click()

        cy.wait('@getDeviceSnapshots').then(() => {
            cy.get('[data-el="empty-state"]').should('not.exist')
            cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length', snapshotCount)
        })
    })

    it('offers correct options in snapshot table kebab menu', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', snapshots).as('getSnapshots')
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()

        // check the view all snapshots option
        cy.get('[data-form="device-only-snapshots"]').click()
        cy.wait('@getSnapshots')

        // click kebab menu in row 1 - a device snapshot
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // check the options are present
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').should('have.length', 5)
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DEPLOY_SNAPSHOT).contains('Deploy Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot').and('not.have.class', 'disabled')
        // clear the kebab menu by clicking the table
        cy.get('[data-el="snapshots"]').click()

        // click kebab menu in row 2 - an instance snapshot
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(1).click()
        // click kebab menu in row 2 - an instance snapshot
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').should('have.length', 5)
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DEPLOY_SNAPSHOT).contains('Deploy Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_VIEW_SNAPSHOT).contains('View Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_SNAPSHOT).contains('Download Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DOWNLOAD_PACKAGE).contains('Download package.json')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).contains('Delete Snapshot')
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(IDX_DELETE_SNAPSHOT).should('have.class', 'disabled')
    })

    it('provides functionality to view a snapshot', () => {
        cy.intercept('GET', '/api/*/applications/*/snapshots*', deviceSnapshots).as('getSnapshots')
        cy.intercept('GET', '/api/*/snapshots/*/full', deviceFullSnapshot).as('fullSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()

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

    it('upload snapshot with credentials', () => {
        cy.fixture('snapshots/snapshot-with-credentials.json', null).as('snapshot')
        cy.intercept('POST', '/api/*/snapshots/import').as('importSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()

        // click data-action="import-snapshot" to open the dialog
        cy.get('[data-action="import-snapshot"]').click()

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
        cy.fixture('snapshots/instance2-full-snapshot2.json', null).as('snapshot')
        cy.intercept('POST', '/api/*/snapshots/import').as('importSnapshot')

        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()

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
})
