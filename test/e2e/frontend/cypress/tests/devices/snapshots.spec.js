describe('FlowForge - Devices', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
        cy.contains('span', 'application-device-a').click()
    })

    it('should not show "Developer Mode" options without billing enabled', () => {
        cy.get('[data-el=device-devmode-toggle]').should('not.exist')
        cy.get('[data-action=open-editor]').should('not.exist')
    })

    it('exposes a "Snapshots" tab', () => {

    })
})
