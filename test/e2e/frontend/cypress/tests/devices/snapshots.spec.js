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

    it('exposes the "Version History" tab if assigned to an Instance but the Snapshots tab has an empty state message', () => {
        cy.contains('span', 'assigned-device-a').click()
        cy.get('[data-nav="version-history"]').should('exist')
        cy.get('[data-nav="version-history"]').click()

        cy.get('[data-action="import-snapshot"]').should('exist')
        cy.get('[data-action="import-snapshot"]').should('be.disabled')

        cy.get('[data-el="empty-state"]').should('exist')
        cy.get('[data-el="empty-state"]').contains('Snapshots are available when a Remote Instance is assigned to an Application')
    })
})
