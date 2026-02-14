describe('FlowFuse - Devices', () => {
    beforeEach(() => {
        cy.intercept('/api/*/settings', (req) => {
            req.reply((response) => {
                response.body.features.deviceEditor = true
                return response
            })
        }).as('enableDeviceEditorFeature')
        cy.intercept('GET', '/api/*/teams/*/devices*', (req) => {
            req.reply((response) => {
                if (response.body && response.body.devices) {
                    response.body.devices = response.body.devices.map(device => {
                        delete device.lastSeenAt
                        return device
                    })
                }
                return response
            })
        }).as('getDevices')
        cy.intercept('GET', '/api/*/devices/*', (req) => {
            req.reply((response) => {
                if (response.body && response.body.lastSeenAt) {
                    response.body.lastSeenAt = null
                    delete response.body.lastSeenAt
                }
                return response
            })
        }).as('getDevice')

        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
        cy.wait('@getDevices')
        cy.wait('@enableDeviceEditorFeature')
    })

    it('should provide a CTA to "Finish Setup" if the device has never been connected', () => {
        cy.contains('span', 'application-device-a').click()
        cy.wait('@getDevice')
        // check finish setup button exists
        cy.get('[data-action="finish-setup"]').should('exist')
    })

    it('should show the "Regenerate Credentials" dialog when the "Finish Setup" CTA is clicked', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-el="team-device-config-dialog"]').should('not.be.visible')
        // check finish setup button exists
        cy.get('[data-action="finish-setup"]').click()
        cy.get('[data-el="team-device-config-dialog"]').should('be.visible')
    })
})
