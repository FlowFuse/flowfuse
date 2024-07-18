describe('FlowForge - Notifications', () => {
    describe('Team Invitations', () => {
        describe('appear as notification messages', () => {
            it('to users that have no team memberships', () => {
                cy.login('dave', 'ddPassword')

                cy.intercept('/api/*/user').as('getUser')
                cy.intercept('/api/*/settings').as('getSettings')
                cy.intercept('/api/*/user/teams').as('getTeams')
                cy.intercept('/api/*/user/invitations', {
                    meta: {},
                    count: 2,
                    invitations: [
                        {
                            id: '1',
                            role: 30,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                            expiresAt: new Date().setTime((new Date()).getTime() + 3600000),
                            team: {
                                id: 'gY9GQjDb2k',
                                name: 'ATeam',
                                slug: 'ateam'
                            },
                            invitor: {
                                id: 'AJ1lQQjlqR',
                                username: 'alice',
                                name: 'Alice Skywalker'
                            },
                            invitee: {
                                id: 'qMN5ng9xYv',
                                username: 'bob',
                                name: 'Bob'
                            }
                        },
                        {
                            id: '2',
                            role: 30,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                            expiresAt: new Date().setTime((new Date()).getTime() + 3600000),
                            team: {
                                id: 'gY9GQjDb2k',
                                name: 'BTeam',
                                slug: 'bteam'
                            },
                            invitor: {
                                id: 'AJ1lQQjlqR',
                                username: 'bob',
                                name: 'Bob Solo'
                            },
                            invitee: {
                                id: 'qMN5ng9xYv',
                                username: 'bob',
                                name: 'Bob'
                            }
                        }
                    ]
                }).as('getInvitations')

                cy.intercept('/api/*/admin/stats').as('getAdminStats')
                cy.intercept('/api/*/admin/license').as('getAdminLicense')

                cy.visit('/')

                cy.wait('@getUser')
                cy.wait('@getSettings')
                cy.wait('@getTeams')
                cy.wait('@getInvitations')

                cy.get('[data-el="right-drawer"').should('not.be.visible')

                cy.get('[data-el="notifications-button"')
                    .should('exist')
                    .contains(2)

                cy.get('[data-el="notifications-button"').click()

                cy.get('[data-el="right-drawer"').should('be.visible')

                cy.get('[data-el="right-drawer"').within(() => {
                    cy.get('[data-el="notifications-drawer"]')

                    cy.get('[data-el="invitation-message"]').should('have.length', 2)
                    cy.get('[data-el="invitation-message"]').contains('Team Invitation')
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by Alice Skywalker to join ATeam.')
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by Bob Solo to join BTeam.')

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation').click()

                    cy.url().should('include', 'account/teams/invitations')
                })
            })

            it('to users that are part of teams', () => {
                cy.login('bob', 'bbPassword')

                cy.intercept('/api/*/user').as('getUser')
                cy.intercept('/api/*/settings').as('getSettings')
                cy.intercept('/api/*/user/teams').as('getTeams')
                cy.intercept('/api/*/user/invitations', {
                    meta: {},
                    count: 1,
                    invitations: [
                        {
                            id: '1',
                            role: 30,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                            expiresAt: new Date().setTime((new Date()).getTime() + 3600000),
                            team: {
                                id: 'gY9GQjDb2k',
                                name: 'Alice\'s team',
                                slug: 'team-alice',
                                avatar: '//www.gravatar.com/avatar/3f9a1fa9ff68277d3e9b5369250be8d9?d=identicon',
                                links: {
                                    self: 'http://localhost:3000/api/v1/teams/gY9GQjDb2k'
                                }
                            },
                            invitor: {
                                id: 'AJ1lQQjlqR',
                                username: 'alice',
                                name: 'Alice'
                            },
                            invitee: {
                                id: 'qMN5ng9xYv',
                                username: 'bob',
                                name: 'Bob'
                            }
                        }
                    ]
                }).as('getInvitations')

                cy.visit('/')

                cy.wait('@getUser')
                cy.wait('@getSettings')
                cy.wait('@getTeams')
                cy.wait('@getInvitations')

                cy.get('[data-el="right-drawer"').should('not.be.visible')

                cy.get('[data-el="notifications-button"')
                    .should('exist')
                    .contains(1)

                cy.get('[data-el="notifications-button"').click()

                cy.get('[data-el="right-drawer"').should('be.visible')

                cy.get('[data-el="right-drawer"').within(() => {
                    cy.get('[data-el="notifications-drawer"]')

                    cy.get('[data-el="invitation-message"]').should('have.length', 1)
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by Alice to join Alice\'s team.')
                    cy.get('[data-el="invitation-message"]').contains('1 hour ago')

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation').click()

                    cy.url().should('include', 'account/teams/invitations')
                })
            })
        })
    })
})
