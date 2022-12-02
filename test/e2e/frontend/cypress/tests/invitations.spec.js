// test team invitations in FlowForge

describe('FlowForge platform invitees', () => {
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
        // should show one pending invite
        cy.get('[data-el="notification-pill"]').should('have.text', '2')

        // user should see a message
        cy.get('[data-nav="team-invites"]').should('be.visible')
        cy.get('[data-nav="team-invites"]').click()

        cy.url().should('include', '/account/teams/invitations')

        // should have 2 pending invites
        cy.get('[data-el="table"] tbody').find('tr').should('have.length', 2)

        // click the kebab menu of the first item
        cy.get('[data-el="table"] tbody').find('.ff-kebab-menu').eq(0).click()

        // accept the invite
        cy.get('[data-el="table"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').contains('Reject').click()

        cy.get('[data-el="table"] tbody').find('tr').should('have.length', 1)

        cy.get('[data-action="team-selection"]').should('not.be.visible')

        // should still be on the invites page
        cy.url().should('include', '/account/teams/invitations')
    })

    it('can accept an invitation to a new team and is navigated to the team\'s dashboard', () => {
        // should show one pending invite
        cy.get('[data-el="notification-pill"]').should('have.text', '1')

        // user should see a message
        cy.get('[data-nav="team-invites"]').should('be.visible')
        cy.get('[data-nav="team-invites"]').click()

        cy.url().should('include', '/account/teams/invitations')

        // click the kebab menu of the first item
        cy.get('[data-el="table"] tbody').find('.ff-kebab-menu').eq(0).click()
        // accept the invite
        cy.get('[data-el="table"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').contains('Accept').click()

        cy.get('[data-action="team-selection"]').should('be.visible')
        // should have navigated to the team dashboard
        cy.url().should('include', '/team/bteam/overview')
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
