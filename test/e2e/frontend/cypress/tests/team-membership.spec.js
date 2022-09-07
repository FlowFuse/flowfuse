describe('FlowForge - Team Membership', () => {
    // let team // , project

    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('loads team members into the data table', () => {
        cy.visit('team/ateam/members/general')
        cy.wait(['@getInvitations'])

        cy.get('[data-el="members-table"] tbody').find('tr').should('have.length', 3)
    })

    it('member cannot can invite or remove a user', () => {
        cy.login('charlie', 'ccPassword')
        cy.visit('team/ateam/members/general')
        cy.wait(['@getTeamMembers'])

        // kebab menu should NOT be available to non owner
        cy.get('[data-el="members-table"] tbody').find('.ff-kebab-menu').should('have.length', 0)
    })

    it('admin/owner can remove a member from the team', () => {
        cy.intercept('DELETE', '/api/*/teams/*/members/*').as('removeTeamMember')

        cy.visit('team/ateam/members/general')
        cy.wait(['@getTeamMembers'])

        // check we have 3 members
        cy.get('[data-el="members-table"] tbody').find('tr').should('have.length', 3)

        // open click kebab menu of 3rd member (charlie)
        cy.get('[data-el="members-table"] tbody').find('.ff-kebab-menu').eq(2).click()

        // click "member-remove-from-team"
        cy.get('[data-el="members-table"] tbody .ff-kebab-menu .ff-kebab-options').find('[data-action="member-remove-from-team"]').click()

        cy.get('.ff-dialog-box').should('be.visible')

        // confirm deletion
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--danger').contains('Remove').click()

        // wait for deletion to finish
        cy.wait('@removeTeamMember')

        // check it has been deleted
        cy.get('[data-el="members-table"] tbody').find('tr').should('have.length', 2)
    })

    it('owner/admin can invite user', () => {
        cy.intercept('/api/*/teams/*/invitations').as('getTeamsInvitations')
        cy.visit('team/ateam/members/general')
        cy.wait(['@getInvitations'])

        // click invite button
        cy.get('[data-action="member-invite-button"]').click()

        // invite dave
        cy.get('.ff-dialog-box').should('be.visible')
        cy.get('.ff-dialog-box .ff-input > input').type('dave')

        // click invite button
        cy.get('.ff-dialog-box > .ff-dialog-actions > .ff-btn--primary').contains('Invite').click()
        cy.wait('@getTeamsInvitations')
    })

    it('loads invitations into the data table', () => {
        cy.visit('team/ateam/members/invitations')
        cy.wait('@getInvitations')
        cy.get('[data-el="invites-table"] tbody').find('tr').should('have.length', 1)
    })

    it('user can accept a team invite', () => {
        cy.intercept('PATCH', '/api/*/user/invitations/*').as('acceptInvite')

        cy.login('dave', 'ddPassword')
        cy.visit('account/teams/invitations')
        cy.wait('@getInvitations')

        // dave should have 1 invite
        cy.get('[data-el="table"] tbody tr').should('have.length', 1)
        cy.get('[data-el="table"] tbody tr td.status-message').should('have.length', 0)

        // click kebab menu
        cy.get('[data-el="table"] tbody').find('.ff-kebab-menu').click()

        // click accept
        cy.get('[data-action="accept"]').click()

        // wait for invitation to be accepted and reloaded
        cy.wait('@acceptInvite')
        cy.visit('account/teams/invitations')
        cy.wait(['@getTeams', '@getInvitations'])

        // check it has been removed (note: tr will have 1 td with "No Data Found" and a class of .status-message when empty)
        cy.get('[data-el="table"] tbody tr').should('have.length', 1) // 1 row stating "No Data Found"
        cy.get('[data-el="table"] tbody tr td').contains('No Data Found')
    })
})
