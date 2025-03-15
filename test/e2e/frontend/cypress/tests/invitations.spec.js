// test team invitations in FlowForge

describe('FlowFuse platform invitees', () => {
    beforeEach(() => {
        cy.login('dave', 'ddPassword')

        cy.intercept('/api/*/user').as('getUser')
        cy.intercept('/api/*/settings').as('getSettings')
        cy.intercept('/api/*/user/teams').as('getTeams')
        cy.intercept('/api/*/user/invitations').as('getInvitations')

        cy.intercept('/api/*/admin/stats').as('getAdminStats')
        cy.intercept('/api/*/admin/license').as('getAdminLicense')

        cy.visit('/')

        cy.wait('@getUser')
        cy.wait('@getSettings')
        cy.wait('@getTeams')
        cy.wait('@getInvitations')
    })

    it('can reject an invitation to a new team', () => {
        cy.get('[data-el="desktop-nav-right"]').within(() => {
            cy.get('[data-el="notification-pill"]').should('have.text', '2')
            cy.get('[data-el="notifications-button"]').click()
        })

        cy.get('[data-el="notifications-drawer"]').should('be.visible')
        cy.get('[data-el="invitation-message"]').eq(0).click()

        // user should see a message

        cy.url().should('include', '/account/teams/invitations')

        // should have 2 pending invites
        cy.get('[data-el="table"] tbody').find('tr').should('have.length', 2)

        // reject the invite
        cy.get('[data-el="table"] tbody').find('[data-action="invite-reject"]').eq(0).click()

        cy.get('[data-el="table"] tbody').find('tr').should('have.length', 1)

        cy.get('[data-action="team-selection"]').should('not.be.visible')

        // should still be on the invites page
        cy.url().should('include', '/account/teams/invitations')
    })

    it('can accept an invitation to a new team and is navigated to the team\'s dashboard', () => {
        // should show one pending invite
        cy.get('[data-el="desktop-nav-right"]').within(() => {
            cy.get('[data-el="notifications-button"]').click()
        })

        cy.get('[data-el="notifications-drawer"]').should('be.visible')
        cy.get('[data-action="show-read-check"]').click()
        cy.get('[data-el="invitation-message"]').eq(0).click()

        cy.url().should('include', '/account/teams/invitations')

        // accept the invite
        cy.get('[data-el="table"] tbody').find('[data-action="invite-accept"]').eq(0).click()

        cy.get('[data-action="team-selection"]').should('be.visible')
        // should have navigated to the team dashboard
        cy.url().should('include', '/team/bteam/applications')
    })
})

describe('FlowForge stores invitation-based audit logs', () => {
    it('when an invitation is rejected', () => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/team/ateam/audit-log')
        cy.get('.ff-audit-entry').contains('User Invite Rejected')
        cy.logout()
        cy.visit('/')
    })

    it('when an invitation is accepted', () => {
        cy.login('bob', 'bbPassword')
        cy.home()
        cy.visit('/team/bteam/audit-log')
        cy.get('.ff-audit-entry').contains('User Invite Accepted')
    })
})
