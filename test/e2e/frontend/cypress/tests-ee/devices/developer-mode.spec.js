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

    it('provides an option to enable "Developer Mode" when deviceEditor feature is enabled and device is owned by an Application', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-el="device-devmode-toggle"]').should('exist')
    })

    it('has "Developer Mode" tab and status pill when Dev mode is enabled', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-devmode"]').should('not.exist')
        cy.get('[data-el="badge-devmode"]').should('not.exist')
        cy.get('[data-el="badge-fleetmode"]').should('exist')
        cy.get('[data-el="device-devmode-toggle"]').click()
        cy.get('[data-nav="device-devmode"]').should('exist')
        cy.get('[data-el="badge-devmode"]').should('exist')
        cy.get('[data-el="badge-fleetmode"]').should('not.exist')

        // reset dev mode state
        cy.get('[data-el="device-devmode-toggle"]').click()
        // verify dialog contains correct text
        cy.get('[data-el=platform-dialog] > .ff-dialog-box .ff-dialog-content').contains('Any changes made to the device whilst in developer mode will be lost')
        cy.get('[data-el=platform-dialog] > .ff-dialog-box .ff-dialog-header').contains('Disable Developer Mode')
        cy.get('[data-el=platform-dialog] > .ff-dialog-box [data-action="dialog-confirm"]').click() // click confirm
    })

    it('is redirected away from the Developer Mode tab if leaving that mode, whilst the tab is open', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-el="device-devmode-toggle"]').click()
        cy.get('[data-nav="device-devmode"]').click()

        cy.url().should('include', '/developer-mode')

        // reset dev mode state
        cy.get('[data-el="device-devmode-toggle"]').click()
        cy.get('[data-el=platform-dialog] > .ff-dialog-box [data-action="dialog-confirm"]').click() // click confirm
        cy.url().should('not.include', '/developer-mode')
    })

    it('has the option to "Create Snapshot" if owned by an Application', () => {
        /// Assigned to nothing
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-el="device-devmode-toggle"]').click() // enable
        cy.get('[data-nav="version-history"]').click() // switch to Version History

        cy.get('[data-action="create-snapshot"]').should('not.be.disabled')
        // get first of these buttons
        cy.get('[data-action="create-snapshot"]').first().click()
        cy.get('[data-form="set-as-target"]').should('exist')

        // close the dialog
        cy.get('[data-el="dialog-create-device-snapshot"] [data-action="dialog-cancel"]').click() // click cancel

        cy.get('[data-el="device-devmode-toggle"]').click() // rest to dev mode off
        cy.get('[data-el=platform-dialog] > .ff-dialog-box [data-action="dialog-confirm"]').click() // click confirm
    })

    it('does not have the option to "Create Snapshot" if owned by an Hosted Instance', () => {
        /// Assigned to nothing
        cy.contains('span', 'assigned-device-a').click()
        cy.get('[data-nav="version-history"]').click() // switch to Version History

        cy.get('[data-action="create-snapshot"]').should('be.disabled')
    })

    it('has the create snapshot disabled if the snapshot is not assigned to an application or instance', () => {
        /// Assigned to nothing
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-devmode-toggle"]').click() // enable
        cy.get('[data-nav="device-devmode"]').click() // switch to dev mode tab
        cy.get('[data-action="create-snapshot-dialog"]').should('be.disabled')
        cy.get('[data-el="device-devmode-toggle"]').click() // reset
        cy.get('[data-el=platform-dialog] > .ff-dialog-box [data-action="dialog-confirm"]').click() // click confirm

        // Assigned to an instance
        cy.visit('/team/bteam/devices')
        cy.contains('span', 'assigned-device-a').click()
        cy.get('[data-el="device-devmode-toggle"]').then(($el) => {
            if ($el.find('.ff-toggle-switch').hasClass('checked')) {
                // dev mode is enabled - do nothing
            } else {
                cy.get('[data-el="device-devmode-toggle"]').click()
            }
        }).then(() => {
            cy.get('[data-nav="device-devmode"]').click()

            cy.get('[data-action="create-snapshot-dialog"]').should('not.be.disabled')
            cy.get('[data-el="device-devmode-toggle"]').click() // reset
            cy.get('[data-el=platform-dialog] > .ff-dialog-box [data-action="dialog-confirm"]').click() // click confirm
        })

        /// Assigned to application
        cy.visit('/team/bteam/devices')
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-el="device-devmode-toggle"]').then(($el) => {
            if ($el.find('.ff-toggle-switch').hasClass('checked')) {
                // dev mode is enabled - do nothing
            } else {
                cy.get('[data-el="device-devmode-toggle"]').click()
            }
        }).then(() => {
            cy.get('[data-nav="device-devmode"]').click()

            cy.get('[data-action="create-snapshot-dialog"]').should('not.be.disabled')
            cy.get('[data-el="device-devmode-toggle"]').click() // reset
            cy.get('[data-el=platform-dialog] > .ff-dialog-box [data-action="dialog-confirm"]').click() // click confirm
        })
    })
})
