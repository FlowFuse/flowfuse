/* eslint-disable cypress/require-data-selectors */
/// <reference types="cypress" />

// NOTE: The tests in this file can only be run once per test run because the
// devices are defined in the backend and are not reset between tests

describe('FlowForge - Devices', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    describe('bulk operations', () => {
        describe('move', () => {
            it('should enable/disable actions dropdown based on selection', () => {
                // ensure "select all" checkbox is unchecked
                cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
                // ensure all devices are unselected
                cy.get('[data-el="devices-browser"] tbody tr').each(($tr) => {
                    cy.wrap($tr).find('input[type="checkbox"]').should('not.be.checked')
                })
                // ensure the actions dropdown is disabled
                cy.get('[data-el="bulk-actions-dropdown"] button').should('be.disabled')

                // select a single device
                cy.get('[data-el="devices-browser"] tbody tr').eq(0).find('.checkbox').click()
                // ensure "select all" checkbox is still unchecked
                cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
                // ensure the actions dropdown is enabled
                cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
            })

            moveTo('application')
            moveTo('instance')
            moveTo('unassigned')

            /**
             * Moves devices ending in "bulk-test-#" (where # is 1 ~ 3) to the specified kind (application, instance, unassigned)
             */
            function moveTo (kind) {
                let options = {
                    moveTo: 'application-2',
                    menuToOpen: 'menu-move to application',
                    dialog: 'assign-device-to-application-dialog',
                    dialogText1: 'The following devices will be affected by this operation:',
                    dialogText2: 'Select the Node-RED application you want to move the devices to'
                }
                if (kind === 'instance') {
                    options = {
                        moveTo: 'instance-2-1',
                        menuToOpen: 'menu-move to instance',
                        dialog: 'assign-device-to-instance-dialog',
                        dialogText1: 'The following devices will be affected by this operation:',
                        dialogText2: 'Select the Node-RED instance you want to move the devices to'
                    }
                } else if (kind === 'unassigned') {
                    options = {
                        moveTo: 'Unassigned',
                        menuToOpen: 'menu-unassign',
                        dialog: 'team-bulk-device-unassign-dialog',
                        dialogText1: 'The following devices will be removed from their current assignment:',
                        dialogText2: 'This will stop the flows running on the devices.'
                    }
                }

                it(`should move selected devices to ${kind}`, () => {
                    // intercept the devices API call and store the response data
                    cy.intercept('/api/*/teams/*/devices*').as('getDevices')

                    // wait for the devices API call to complete
                    cy.wait(['@getDevices']).then(({ response }) => {
                        const devices = response.body.devices

                        // initial checks to help better understand test fail output
                        expect(devices).to.be.an('array')
                        expect(devices.length).to.be.greaterThan(3)

                        // find 3 sacrificial devices with names ending "bulk-test-#" (where # is 1 ~ 3)
                        const sacrificialDevices = devices.filter((device) => device.name && device.name.match(/bulk-test-\d$/))
                        cy.get('[data-el="devices-browser"] tbody tr').contains(sacrificialDevices[0].name).parent().parent().find('.checkbox').click()
                        cy.get('[data-el="devices-browser"] tbody tr').contains(sacrificialDevices[1].name).parent().parent().find('.checkbox').click()
                        cy.get('[data-el="devices-browser"] tbody tr').contains(sacrificialDevices[2].name).parent().parent().find('.checkbox').click()

                        // ensure 3 devices are selected
                        cy.get('[data-el="devices-browser"] tbody tr input[type="checkbox"]:checked').should('have.length', 3)

                        // ensure the action dropdown is now enabled
                        cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
                        cy.get('[data-el="bulk-actions-dropdown"] button').click()

                        // ensure the menu contains the "Move to application", "Move to instance" and "Unassign" options
                        cy.get('[data-action="menu-move to application"]').should('be.visible')
                        cy.get('[data-action="menu-move to instance"]').should('be.visible')
                        cy.get('[data-action="menu-unassign"]').should('be.visible')

                        // click the "Move to _kind_" button
                        cy.get(`[data-action="${options.menuToOpen}"]`).click()

                        // ensure the dialog is visible and has the correct number of devices listed
                        cy.get(`[data-el="${options.dialog}"]`).should('be.visible')
                        cy.get(`[data-el="${options.dialog}"]`).within(() => {
                            // has correct text
                            cy.get('p').contains(options.dialogText1)
                            cy.get('p').contains(options.dialogText2)

                            // has 3 devices
                            cy.get('ul li').should('have.length', 3)
                            cy.get('ul li').contains(sacrificialDevices[0].name)
                            cy.get('ul li').contains(sacrificialDevices[1].name)
                            cy.get('ul li').contains(sacrificialDevices[2].name)

                            if (kind === 'application' || kind === 'instance') {
                                // select 'application-2'
                                cy.get('[data-form="application"] .ff-dropdown').should('be.visible')
                                cy.get('[data-form="application"]').within(() => {
                                    // eslint-disable-next-line cypress/require-data-selectors
                                    cy.get('.ff-dropdown[disabled=false]').click()
                                    // eslint-disable-next-line cypress/require-data-selectors
                                    cy.get('.ff-dropdown-options > .ff-dropdown-option').contains('application-2').click()
                                })
                                if (kind === 'instance') {
                                    // Select 'instance-2-1'
                                    cy.get('[data-form="instance"] .ff-dropdown').should('be.visible')
                                    cy.get('[data-form="instance"]').within(() => {
                                        cy.get('.ff-dropdown[disabled=false]').click()
                                        // eslint-disable-next-line cypress/require-data-selectors
                                        cy.get('.ff-dropdown-options > .ff-dropdown-option').contains('instance-2-1').click()
                                    })
                                }
                            }
                            // click the button
                            cy.get('[data-action="dialog-confirm"]').click()

                            // wait for dialog to close: should no longer be in the DOM
                            cy.get(`[data-el="${options.dialog}"]`).should('not.exist')
                        })

                        // check the table columns for the moved devices
                        cy.get('[data-el="devices-browser"] tbody tr').contains(sacrificialDevices[0].name).parent().parent().find('td').eq(5).contains(options.moveTo)
                        cy.get('[data-el="devices-browser"] tbody tr').contains(sacrificialDevices[0].name).parent().parent().find('td').eq(5).contains(options.moveTo)
                        cy.get('[data-el="devices-browser"] tbody tr').contains(sacrificialDevices[0].name).parent().parent().find('td').eq(5).contains(options.moveTo)
                    })
                })
            }
        })

        // NOTE: The delete tests are last because they delete the temporary "bulk-test-#" devices that are used in the other tests above
        describe('delete', () => {
            it('should enable/disable bulk delete', () => {
                // ensure "select all" checkbox is unchecked
                cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
                // ensure all devices are unselected
                cy.get('[data-el="devices-browser"] tbody tr').each(($tr) => {
                    cy.wrap($tr).find('input[type="checkbox"]').should('not.be.checked')
                })
                // ensure the actions dropdown is disabled
                cy.get('[data-el="bulk-actions-dropdown"] button').should('be.disabled')

                // select a single device
                cy.get('[data-el="devices-browser"] tbody tr').eq(0).find('.checkbox').click()
                // ensure "select all" checkbox is still unchecked
                cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
                // ensure the actions dropdown is enabled
                cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
            })

            it('should display list of devices to delete', () => {
                // intercept the devices API call and store the response data
                cy.intercept('/api/*/teams/*/devices*').as('getDevices')

                // wait for the devices API call to complete
                cy.wait(['@getDevices']).then(({ response }) => {
                    const devices = response.body.devices

                    // initial checks to help better understand test fail output
                    expect(devices).to.be.an('array')
                    expect(devices.length).to.be.greaterThan(3)

                    // select a single device
                    cy.get('[data-el="devices-browser"] tbody tr').eq(0).find('.checkbox').click()
                    // click the menu then click the "Delete" button
                    cy.get('[data-el="bulk-actions-dropdown"] button').click()
                    cy.get('[data-action="menu-delete"]').click()

                    // ensure the dialog is visible
                    cy.get('[data-el="team-bulk-device-delete-dialog"]').should('be.visible')
                    // ensure the dialog has the correct header
                    cy.get('[data-el="team-bulk-device-delete-dialog"] .ff-dialog-header').contains('Confirm Device Delete')
                    // ensure the dialog has the correct text
                    cy.get('[data-el="team-bulk-device-delete-dialog"] p').contains('The following device will be deleted:')
                    // ensure the dialog has the correct number of devices
                    cy.get('[data-el="team-bulk-device-delete-dialog"] ul li').should('have.length', 1)

                    // click the "Cancel" button
                    cy.get('[data-el="team-bulk-device-delete-dialog"] button').contains('Cancel').click()
                    cy.get('[data-el="team-bulk-device-delete-dialog"]').should('not.be.visible')

                    // select all devices
                    cy.get('[data-el="devices-browser"] thead .checkbox').click()

                    // ensure all devices are selected
                    cy.get('[data-el="devices-browser"] tbody tr input[type="checkbox"]:checked').should('have.length', devices.length)

                    // ensure the delete button is now enabled
                    cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
                    cy.get('[data-el="bulk-actions-dropdown"] button').click()
                    cy.get('[data-action="menu-delete"]').click()

                    // ensure the dialog is visible and has the correct number of devices listed
                    cy.get('[data-el="team-bulk-device-delete-dialog"]').should('be.visible')
                    cy.get('[data-el="team-bulk-device-delete-dialog"] ul li').should('have.length', devices.length)

                    // ensure all device names are displayed in the dialog
                    devices.forEach((device) => {
                        cy.get('[data-el="team-bulk-device-delete-dialog"] ul li').contains(device.name)
                    })
                })
            })

            it('should delete selected devices', () => {
                // intercept the devices API call and store the response data
                cy.intercept('/api/*/teams/*/devices*').as('getDevices')

                // wait for the devices API call to complete
                cy.wait(['@getDevices']).then(({ response }) => {
                    const devices = response.body.devices

                    // initial checks to help better understand test fail output
                    expect(devices).to.be.an('array')
                    expect(devices.length).to.be.greaterThan(3)

                    // wait for device browser to load table
                    cy.get('[data-el="devices-browser"] tbody tr').should('have.length', devices.length)

                    // find 3 sacrificial devices with names ending "bulk-test-#" (where # is 1 ~ 3)
                    const sacrificialDevices = devices.filter((device) => device.name && device.name.match(/bulk-test-\d$/))
                    cy.get('[data-el="devices-browser"] tbody tr').contains(sacrificialDevices[0].name).parent().parent().find('.checkbox').click()
                    cy.get('[data-el="devices-browser"] tbody tr').contains(sacrificialDevices[1].name).parent().parent().find('.checkbox').click()
                    cy.get('[data-el="devices-browser"] tbody tr').contains(sacrificialDevices[2].name).parent().parent().find('.checkbox').click()

                    // ensure 3 devices are selected
                    cy.get('[data-el="devices-browser"] tbody tr input[type="checkbox"]:checked').should('have.length', 3)

                    // click the menu then click the "Delete" button
                    cy.get('[data-el="bulk-actions-dropdown"] button').should('not.be.disabled')
                    cy.get('[data-el="bulk-actions-dropdown"] button').click()
                    cy.get('[data-action="menu-delete"]').should('be.visible')
                    cy.get('[data-action="menu-delete"]').click()

                    // click the dialog "Confirm" button
                    cy.get('[data-el="team-bulk-device-delete-dialog"]').should('be.visible')
                    cy.get('[data-el="team-bulk-device-delete-dialog"] button').contains('Confirm').click()

                    // wait for the devices API call to complete
                    cy.wait(['@getDevices'])

                    // check the number of rows in the table
                    cy.get('[data-el="devices-browser"] tbody tr').should('have.length', devices.length - 3) // there are 3 sacrificial devices

                    // ensure all rows are unselected
                    cy.get('[data-el="devices-browser"] tbody tr').each(($tr) => {
                        cy.wrap($tr).find('input[type="checkbox"]').should('not.be.checked')
                    })
                })
            })
        })
    })
})
