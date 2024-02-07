describe('FlowForge - Team', () => {
    let teamTypeId
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.intercept('GET', '/api/v1/teams/*/applications*').as('getTeamApplications')
        cy.intercept('DELETE', '/api/v1/teams/*').as('deleteTeam')
    })

    describe('Delete Team', () => {
        it('can delete empty team', () => {
            const TEAM_NAME = `new-team-${Math.random().toString(36).substring(2, 7)}`
            let team
            cy.request('GET', 'api/v1/team-types').then(response => {
                teamTypeId = response.body.types[0].id
                return cy.request('POST', 'api/v1/teams', {
                    name: TEAM_NAME,
                    type: teamTypeId
                })
            }).then((response) => {
                team = response.body
                cy.visit(`team/${team.slug}`)
                cy.visit(`team/${team.slug}/settings/danger`)
                // cy.get('[data-action="delete-team"]').should('be.disabled')
                cy.wait('@getTeamApplications')
                cy.get('[data-action="delete-team"]').should('not.be.disabled')

                cy.get('[data-action="delete-team"]').click()

                cy.get('[data-el="delete-team-dialog"]')
                    .should('be.visible')
                    .within(() => {
                        // Dialog is open
                        cy.get('.ff-dialog-header').contains('Delete Team')

                        // Main button should be disabled
                        cy.get('button.ff-btn.ff-btn--danger').should('be.disabled')
                        cy.get('[data-form="team-name"] input[type="text"]').type(TEAM_NAME)

                        // Should now be enabled again
                        cy.get('button.ff-btn.ff-btn--danger').click()

                        cy.wait('@deleteTeam')
                    })
            }).then(() => {
                cy.request('GET', 'api/v1/teams')
            }).then(response => {
                const teams = response.body.teams
                const oldTeam = teams.find(t => t.id === team.id)
                cy.wrap(oldTeam).should('be.a', 'undefined')
            })
        })

        it('can delete team with only empty application', () => {
            let team
            const TEAM_NAME = `new-team-${Math.random().toString(36).substring(2, 7)}`
            const APP_NAME = `new-app-${Math.random().toString(36).substring(2, 7)}`
            cy.request('GET', 'api/v1/team-types').then(response => {
                teamTypeId = response.body.types[0].id
                return cy.request('POST', 'api/v1/teams', {
                    name: TEAM_NAME,
                    type: teamTypeId
                })
            }).then((response) => {
                team = response.body
                return cy.request('POST', 'api/v1/applications', {
                    name: APP_NAME,
                    teamId: team.id
                })
            }).then(response => {
                cy.visit(`team/${team.slug}`)
                cy.visit(`team/${team.slug}/settings/danger`)
                // cy.get('[data-action="delete-team"]').should('be.disabled')
                cy.wait('@getTeamApplications')
                cy.get('[data-action="delete-team"]').should('not.be.disabled')
                cy.get('[data-action="delete-team"]').click()

                cy.get('[data-el="delete-team-dialog"]')
                    .should('be.visible')
                    .within(() => {
                        // Dialog is open
                        cy.get('.ff-dialog-header').contains('Delete Team')

                        // Main button should be disabled
                        cy.get('button.ff-btn.ff-btn--danger').should('be.disabled')
                        cy.get('[data-form="team-name"] input[type="text"]').type(TEAM_NAME)

                        // Should now be enabled again
                        cy.get('button.ff-btn.ff-btn--danger').click()

                        cy.wait('@deleteTeam')
                    })
            })
        })
    })
})
