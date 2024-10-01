const aliceInviteToATeam = require('../fixtures/notifications/alice-invites-to-ateam.json')
const bobInviteToATeam = require('../fixtures/notifications/bob-invites-to-bteam.json')
const eddyAcceptedInvite = require('../fixtures/notifications/eddy-accepted-invite-to-ateam.json')
const instanceCrash = require('../fixtures/notifications/instance-crashed.json')

describe('FlowForge - Notifications', () => {
    describe('Team Invitations', () => {
        describe('appear as notification messages', () => {
            it('to users that have no team memberships', () => {
                cy.login('dave', 'ddPassword')

                cy.intercept('/api/*/user').as('getUser')
                cy.intercept('/api/*/settings').as('getSettings')
                cy.intercept('/api/*/user/teams').as('getTeams')
                cy.intercept('/api/*/user/notifications', {
                    meta: {},
                    count: 2,
                    notifications: [
                        {
                            ...aliceInviteToATeam,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                        },
                        {
                            ...bobInviteToATeam,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                        }
                    ]
                }).as('getNotifications')

                cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

                cy.intercept('/api/*/admin/stats').as('getAdminStats')
                cy.intercept('/api/*/admin/license').as('getAdminLicense')

                cy.visit('/')

                cy.wait('@getUser')
                cy.wait('@getSettings')
                cy.wait('@getTeams')
                cy.wait('@getNotifications')

                cy.get('[data-el="right-drawer"]').should('not.be.visible')

                cy.get('[data-el="desktop-nav-right"]').within(() => {
                    cy.get('[data-el="notifications-button"]')
                        .should('exist')
                        .contains(2)

                    cy.get('[data-el="notifications-button"]').click()
                })

                cy.get('[data-el="right-drawer"]').should('be.visible')

                cy.get('[data-el="right-drawer"]').within(() => {
                    cy.get('[data-el="notifications-drawer"]')

                    cy.get('[data-el="invitation-message"]').should('have.length', 2)
                    cy.get('[data-el="invitation-message"]').contains('Team Invitation')
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by "alice" to join "ATeam".')
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by "bob" to join "BTeam".')

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation').click()
                    cy.wait('@markInvitationRead')
                    cy.url().should('include', 'account/teams/invitations')
                })

                cy.get('[data-el="notifications-button"]')
                    .should('exist')
                    .contains(1)
            })

            it('to users that are part of teams', () => {
                cy.login('bob', 'bbPassword')

                cy.intercept('/api/*/user').as('getUser')
                cy.intercept('/api/*/settings').as('getSettings')
                cy.intercept('/api/*/user/teams').as('getTeams')
                cy.intercept('/api/*/user/notifications', {
                    meta: {},
                    count: 1,
                    notifications: [
                        {
                            id: '1',
                            type: 'team-invite',
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000),
                            read: false,
                            data: {
                                invite: {
                                    id: 'abcd1'
                                },
                                team: {
                                    id: 'gY9GQjDb2k',
                                    name: 'Alice\'s team'
                                },
                                invitor: {
                                    username: 'alice'
                                },
                                role: 30
                            }
                        }
                    ]
                }).as('getNotifications')

                cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

                cy.visit('/')

                cy.wait('@getUser')
                cy.wait('@getSettings')
                cy.wait('@getTeams')
                cy.wait('@getNotifications')

                cy.get('[data-el="right-drawer"]').should('not.be.visible')

                cy.get('[data-el="desktop-nav-right"]').within(() => {
                    cy.get('[data-el="notifications-button"]')
                        .should('exist')
                        .contains(1)

                    cy.get('[data-el="notifications-button"]').click()
                })

                cy.get('[data-el="right-drawer"]').should('be.visible')

                cy.get('[data-el="right-drawer"]').within(() => {
                    cy.get('[data-el="notifications-drawer"]')

                    cy.get('[data-el="invitation-message"]').should('have.length', 1)
                    cy.get('[data-el="invitation-message"]').contains('You have been invited by "alice" to join "Alice\'s team".')
                    cy.get('[data-el="invitation-message"]').contains('1 hour ago')

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation').click()

                    cy.wait('@markInvitationRead')

                    cy.url().should('include', 'account/teams/invitations')
                })
                cy.get('[data-el="notifications-button"]')
                    .should('exist')
                    .contains(1).should('not.exist')
            })

            it('shows a user accepted invitation notification', () => {
                cy.login('alice', 'aaPassword')

                cy.intercept('/api/*/user').as('getUser')
                cy.intercept('/api/*/settings').as('getSettings')
                cy.intercept('/api/*/user/teams').as('getTeams')
                cy.intercept('/api/*/user/notifications', {
                    meta: {},
                    count: 2,
                    notifications: [
                        {
                            ...eddyAcceptedInvite,
                            createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                        }
                    ]
                }).as('getNotifications')

                cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

                cy.intercept('/api/*/admin/stats').as('getAdminStats')
                cy.intercept('/api/*/admin/license').as('getAdminLicense')

                cy.visit('/')

                cy.wait('@getUser')
                cy.wait('@getSettings')
                cy.wait('@getTeams')
                cy.wait('@getNotifications')

                cy.get('[data-el="desktop-nav-right"]').within(() => {
                    cy.get('[data-el="notifications-button"]')
                        .should('exist')
                        .contains(1)

                    cy.get('[data-el="notifications-button"]').click()
                })

                cy.get('[data-el="right-drawer"]').should('be.visible')

                cy.get('[data-el="right-drawer"]').within(() => {
                    cy.get('[data-el="notifications-drawer"]')

                    cy.get('[data-el="invitation-message"]').should('have.length', 1)

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation: Accepted')
                    cy.get('[data-el="invitation-message"]').contains('"eddy" has accepted your invitation to join "Alice\'s Team" as a "dashboard".')

                    cy.get('[data-el="invitation-message"]').contains('Team Invitation').click()
                    cy.wait('@markInvitationRead')
                    cy.url().should('include', '/members/general')
                })
            })
        })
    })

    describe('Instance Crashes', () => {
        it('appear as notification messages', () => {
            cy.login('alice', 'aaPassword')

            cy.intercept('/api/*/user').as('getUser')
            cy.intercept('/api/*/settings').as('getSettings')
            cy.intercept('/api/*/user/teams').as('getTeams')
            cy.intercept('/api/*/user/notifications', {
                meta: {},
                count: 1,
                notifications: [
                    {
                        ...instanceCrash,
                        createdAt: new Date().setTime((new Date()).getTime() - 3600000)
                    }
                ]
            }).as('getNotifications')

            cy.intercept('PUT', '/api/*/user/notifications/*', {}).as('markInvitationRead')

            cy.intercept('/api/*/admin/stats').as('getAdminStats')
            cy.intercept('/api/*/admin/license').as('getAdminLicense')

            cy.visit('/')

            cy.wait('@getUser')
            cy.wait('@getSettings')
            cy.wait('@getTeams')
            cy.wait('@getNotifications')

            cy.get('[data-el="desktop-nav-right"]').within(() => {
                cy.get('[data-el="notifications-button"]')
                    .should('exist')
                    .contains(2)

                cy.get('[data-el="notifications-button"]').click()
            })

            cy.get('[data-el="right-drawer"]').should('be.visible')

            cy.get('[data-el="right-drawer"]').within(() => {
                cy.get('[data-el="notifications-drawer"]')

                cy.get('[data-el="generic-notification"]').should('have.length', 1)

                cy.get('[data-el="generic-notification"]').contains('Node-RED Instance Crashed')
                cy.get('[data-el="generic-notification"]').contains('"instance-1-1" has crashed')

                cy.get('[data-el="generic-notification"]').contains('Node-RED Instance Crashed').click()
                cy.wait('@markInvitationRead')
                cy.url().should('match', /instance\/.*\/overview/)
            })
        })
    })
})
