describe('FlowForge - Devices', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    describe('bulk operations', () => {
        it('should enable/disable bulk delete', () => {
            // ensure "select all" checkbox is unchecked
            cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
            // ensure all devices are unselected
            cy.get('[data-el="devices-browser"] tbody tr').each(($tr) => {
                cy.wrap($tr).find('input[type="checkbox"]').should('not.be.checked')
            })
            // ensure the delete button is disabled (data-action="bulk-delete-devices")
            cy.get('[data-action="bulk-delete-devices"]').should('be.disabled')

            // select a single device
            cy.get('[data-el="devices-browser"] tbody tr').eq(0).find('.checkbox').click()
            // ensure "select all" checkbox is still unchecked
            cy.get('[data-el="devices-browser"] thead input[type="checkbox"]').should('not.be.checked')
            // ensure the delete button is now enabled
            cy.get('[data-action="bulk-delete-devices"]').should('not.be.disabled')
        })

        it('should display list of devices to delete', () => {
            // intercept the devices API call and store the response data
            cy.intercept('/api/*/teams/*/devices*').as('getDevices')

            // wait for the devices API call to complete
            cy.wait(['@getDevices']).then(({ response }) => {
                const devices = response.body.devices

                // select a single device
                cy.get('[data-el="devices-browser"] tbody tr').eq(0).find('.checkbox').click()
                // click the "Delete" button
                cy.get('[data-action="bulk-delete-devices"]').click()

                // ensure the dialog is visible
                cy.get('[data-el="team-bulk-device-delete-dialog"]').should('be.visible')
                // ensure the dialog has the correct header
                cy.get('[data-el="team-bulk-device-delete-dialog"] .ff-dialog-header').contains('Confirm Bulk Device Delete')
                // ensure the dialog has the correct text
                cy.get('[data-el="team-bulk-device-delete-dialog"] p').contains('The following device will be deleted:')
                // ensure the dialog has the correct number of devices
                cy.get('[data-el="team-bulk-device-delete-dialog"] ul li').should('have.length', 1)

                // click the "Cancel" button
                cy.get('[data-el="team-bulk-device-delete-dialog"] button').contains('Cancel').click()
                cy.get('[data-el="team-bulk-device-delete-dialog"]').should('not.be.visible')

                // select all devices
                cy.get('[data-el="devices-browser"] thead .checkbox').click()
                // click the "Delete" button
                cy.get('[data-action="bulk-delete-devices"]').click()
                // ensure the dialog is visible and has the correct number of devices listed
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

                // find 3 sacrificial devices with names ending "bulk-test-#" (where # is 1 ~ 3)
                const sacrificialDevices = devices.filter((device) => device.name.match(/bulk-test-\d$/))
                // select the sacrificial devices. NOTE the .chekbox is in col0 but the text is in col1
                sacrificialDevices.forEach((device) => {
                    cy.get('[data-el="devices-browser"] tbody tr').contains(device.name).parent().closest('tr').find('.checkbox').click()
                })

                // click the "Delete" button
                cy.get('[data-action="bulk-delete-devices"]').click()

                // click the "Confirm" button
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
