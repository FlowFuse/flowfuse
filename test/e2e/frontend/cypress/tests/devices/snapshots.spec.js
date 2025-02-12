describe('FlowForge - Devices', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.visit('/team/bteam/devices')
    })

    it('should not show "Developer Mode" options without billing enabled', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-el=device-devmode-toggle]').should('not.exist')
        cy.get('[data-action=open-editor]').should('not.exist')
    })

    it('exposes a "Snapshots" tab if assigned to an Application & informs users this is a Enterprise Feature', () => {
        cy.contains('span', 'application-device-a').click()
        cy.get('[data-nav="version-history"]').should('exist')
        cy.get('[data-nav="version-history"]').click()
        cy.get('[data-el="page-banner-feature-unavailable"]').should('exist')
    })

    it('exposes a "Snapshots" tab if not assigned to anything & informs users this is a Enterprise Feature', () => {
        cy.contains('span', 'team2-unassigned-device').click()
        cy.get('[data-nav="version-history"]').should('exist')
        cy.get('[data-nav="version-history"]').click()
        cy.get('[data-el="page-banner-feature-unavailable"]').should('exist')
    })

    it('does not expose a "Snapshots" tab if assigned to an Instance', () => {
        cy.contains('span', 'assigned-device-a').click()
        cy.get('[data-nav="version-history"]').should('not.exist')
    })
})
