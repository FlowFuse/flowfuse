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

    it('doesn\'t show a "Snapshots" tab for unassigned devices', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-nav="device-snapshots"]').should('not.exist')
    })

    it('doesn\'t show a "Snapshots" tab for devices bound to an Instance', () => {
        cy.contains('span', 'assigned-device-a').click()
        cy.get('[data-nav="device-snapshots"]').should('not.exist')
    })

    it('shows a "Snapshots" tab for devices bound to an Instance', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').should('exist')
    })

    it('shows only Snapshots for this device by default', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()
        cy.get('[data-el="empty-state"]').should('exist')
    })

    it('allows for users to view all Snapshots for this Device from it\'s parent Application', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="device-snapshots"]').click()
        cy.get('[data-form="device-only-snapshots"]').click()
        cy.get('[data-el="empty-state"]').should('not.exist')
        cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length', 3)
    })
})
