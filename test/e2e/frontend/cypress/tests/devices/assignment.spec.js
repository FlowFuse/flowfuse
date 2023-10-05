describe('FlowForge - Devices', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    it('should inform users if it is assigned to an Instance', () => {
        cy.contains('span', 'assigned-device-a').click()
        cy.get('[data-el="device-assigned-instance"]').should('exist')
    })

    it('should inform users if it is assigned to an Application', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-el="device-assigned-application"]').should('exist')
    })

    it('should inform users if they are not assigned to an instance or Application', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
    })

    it('should provide an option to "Assign" their device if unassigned', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').should('exist')
    })

    it('should provide an option to "Assign" their device if unassigned', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').should('exist')
    })
})

describe('FlowForge - Devices - Assign', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    it('provides an option to the user to choose an Instance or Application', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').click()
        cy.get('[data-el="assignment-dialog"]').click()
    })

    it('successfully assigns the Device to an Instance when that selection is made', () => {
        cy.intercept('/api/*/devices/*').as('getDevice')

        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').click()

        // check the dialog is open
        cy.get('[data-el="assignment-dialog"]').should('be.visible')
        cy.get('[data-el="assignment-dialog"] [data-action="dialog-confirm"]').should('be.disabled')
        // Choose "Instance"
        cy.get('[data-form="assign-to-instance"]').click()
        cy.get('[data-el="assignment-dialog"] [data-action="dialog-confirm"]').click()

        // check the dialog has closed
        cy.get('[data-el="assignment-dialog"]').should('not.be.visible')
        cy.get('[data-el="assignment-dialog-instance"]').should('be.visible')

        cy.get('[data-el="assignment-dialog-instance"] [data-form="application"] .ff-dropdown').click()
        cy.get('[data-el="assignment-dialog-instance"] [data-form="application"] .ff-dropdown-options > .ff-dropdown-option').eq(0).click()

        cy.get('[data-el="assignment-dialog-instance"] [data-form="instance"] .ff-dropdown').click()
        cy.get('[data-el="assignment-dialog-instance"] [data-form="instance"] .ff-dropdown-options > .ff-dropdown-option').eq(0).click()

        cy.get('[data-el="assignment-dialog-instance"] [data-action="dialog-confirm"]').click()

        cy.wait('@getDevice').then(() => {
            cy.get('[data-el="device-assigned-instance"]').should('exist')
        })
    })

    it('provides an unassign option for the Device assigned to an Instance in the Device Settings', () => {
        cy.intercept('/api/*/devices/*').as('getDevice')

        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-instance"]').should('exist')

        // Go to "Settings"
        cy.get('[data-nav="device-settings"]').click()
        cy.get('[data-action="unassign-device"]').click()

        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] [data-action="dialog-confirm"]').click()

        cy.wait('@getDevice').then(() => {
            cy.get('[data-el="device-assigned-instance"]').should('not.exist')
            cy.get('[data-el="device-assigned-none"]').should('exist')
        })
    })

    it('successfully assigns the Device to an Application when that selection is made', () => {
        cy.intercept('/api/*/devices/*').as('getDevice')

        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-none"]').should('exist')
        cy.get('[data-el="device-assigned-none"] [data-action="assign-device"]').click()

        // check the dialog is open
        cy.get('[data-el="assignment-dialog"]').should('be.visible')
        cy.get('[data-el="assignment-dialog"] [data-action="dialog-confirm"]').should('be.disabled')
        // Choose "Application"
        cy.get('[data-form="assign-to-application"]').click()
        cy.get('[data-el="assignment-dialog"] [data-action="dialog-confirm"]').click()

        // check the dialog has closed
        cy.get('[data-el="assignment-dialog"]').should('not.be.visible')
        cy.get('[data-el="assignment-dialog-application"]').should('be.visible')

        cy.get('[data-el="assignment-dialog-application"] [data-form="application"] .ff-dropdown').click()
        cy.get('[data-el="assignment-dialog-application"] [data-form="application"] .ff-dropdown-options > .ff-dropdown-option').eq(0).click()

        cy.get('[data-el="assignment-dialog-application"] [data-action="dialog-confirm"]').click()

        cy.wait('@getDevice').then(() => {
            cy.get('[data-el="device-assigned-application"]').should('exist')
        })
    })

    it('provides an unassign option for the Device assigned to an Application in the Device Settings', () => {
        cy.intercept('/api/*/devices/*').as('getDevice')

        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-el="device-assigned-application"]').should('exist')

        // Go to "Settings"
        cy.get('[data-nav="device-settings"]').click()
        cy.get('[data-action="unassign-device"]').click()

        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] [data-action="dialog-confirm"]').click()

        cy.wait('@getDevice').then(() => {
            cy.get('[data-el="device-assigned-application"]').should('not.exist')
            cy.get('[data-el="device-assigned-none"]').should('exist')
        })
    })
})
