describe('FlowForge - Notifications Hub', () => {
    it('is accessible from the admin menu', () => {
        cy.login('alice', 'aaPassword')

        cy.home()

        cy.visit('admin/overview')

        cy.wait(['@getSettings'])

        cy.get('[data-nav="notifications-hub"]').click()

        cy.url().should('include', 'notifications-hub')

        cy.get('[data-el="page-name"]').contains('Notifications Hub')
    })

    it('can send a platform-wide notification', () => {
        cy.intercept('POST', '/api/*/admin/announcements', { recipientCount: 2 }).as('postAnnouncement')
        cy.login('alice', 'aaPassword')

        cy.home()

        cy.visit('admin/notifications-hub')

        cy.wait(['@getSettings'])

        cy.get('[data-action="submit"]').should('be.disabled')
        cy.get('[data-el="notification-title"] input').type('Notification Title')
        cy.get('[data-action="submit"]').should('be.disabled')
        cy.get('[data-el="notification-message"] textarea').type('Lorem ipsum and Dolores Umbrige')
        cy.get('[data-action="submit"]').should('be.disabled')
        cy.get('[data-el="notification-external-url"] input').type('https://flowfuse.com')
        cy.get('[data-action="submit"]').should('be.disabled')
        cy.get('[data-el="audience-role-owner"]').click()
        cy.get('[data-action="submit"]').should('not.be.disabled')

        cy.get('[data-el="platform-dialog"]').should('not.be.visible')

        cy.get('[data-action="submit"]').click()

        cy.get('[data-el="platform-dialog"]').should('be.visible')

        cy.get('[data-el="platform-dialog"] .ff-dialog-header').contains('Platform Wide Announcement')
        cy.get('[data-el="platform-dialog"] .ff-dialog-content').contains('You are about to send an announcement to 2 recipients.')

        cy.get('[data-action="dialog-cancel"]').click()
        cy.get('[data-el="platform-dialog"]').should('not.be.visible')

        cy.get('[data-action="submit"]').click()
        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-action="dialog-confirm"]').click()

        cy.get('[data-el="notification-title"] input').should('be.empty')
        cy.get('[data-el="notification-message"] textarea').should('be.empty')
    })
})
