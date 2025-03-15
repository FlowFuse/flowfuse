describe('FlowForge - Devices', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    it('should provide a CTA to "Finish Setup" if the device has never been connected', () => {
        cy.contains('span', 'application-device-a').click()
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
