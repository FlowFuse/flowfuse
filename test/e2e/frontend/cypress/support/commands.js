// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// fixtures: https://docs.cypress.io/guides/guides/network-requests

// Login - use the FF API to directly login
Cypress.Commands.add('login', (username, password) => {
    cy.session([username, password], () => {
        // wait for data to get refreshed
        cy.request('post', '/account/login', {
            username,
            password
        })
    })
})

Cypress.Commands.add('logout', (username, password) => {
    cy.request('post', '/account/logout')
})

// Navigate to the home page, and given we are logged in,
// wait until all API calls have completed before moving on
Cypress.Commands.add('home', (username, password) => {
    // checkState from vue store
    cy.intercept('/api/*/user').as('getUser')
    cy.intercept('/api/*/settings').as('getSettings')
    cy.intercept('/api/*/user/teams').as('getTeams')
    cy.intercept('/api/*/teams/*').as('getTeam')
    cy.intercept('/api/*/teams/*/user').as('getTeamRole')
    cy.intercept('/api/*/teams/*/members').as('getTeamMembers')
    cy.intercept('/api/*/teams/*/projects').as('getTeamProjects')
    cy.intercept('/api/*/user/invitations').as('getInvitations')

    cy.intercept('/api/*/admin/stats').as('getAdminStats')
    cy.intercept('/api/*/admin/license').as('getAdminLicense')

    cy.visit('/')

    cy.wait('@getUser')
    cy.wait('@getSettings')
    cy.wait('@getTeam')
    cy.wait('@getTeams')
    cy.wait('@getTeamRole')
    cy.wait('@getTeamMembers')
    cy.wait('@getTeamProjects')
    cy.wait('@getInvitations')

    cy.url().should('include', '/overview')
})

// Navigate to the home page, and given we are logged in,
// wait until all API calls have completed before moving on
// however members do not wait for @getTeamMembers or @getTeamProjects
Cypress.Commands.add('overview', (username, password) => {
    /** @type {import('cypress')} */
    cy.intercept('/api/*/user').as('getUser')
    cy.intercept('/api/*/settings').as('getSettings')
    cy.intercept('/api/*/user/teams').as('getTeams')
    cy.intercept('/api/*/teams/*').as('getTeam')
    cy.intercept('/api/*/teams/*/user').as('getTeamRole')
    cy.intercept('/api/*/user/invitations').as('getInvitations')

    cy.intercept('/api/*/admin/stats').as('getAdminStats')
    cy.intercept('/api/*/admin/license').as('getAdminLicense')

    cy.visit('/team/ateam/overview')

    cy.wait('@getUser')
    cy.wait('@getSettings')
    cy.wait('@getTeam')
    cy.wait('@getTeams')
    cy.wait('@getTeamRole')
    cy.wait('@getInvitations')

    cy.url().should('include', '/overview')
})

// resets T+Cs.
// Should be called AFTER cy.login(admin, adminPass)
Cypress.Commands.add('resetTermsAndCondition', () => {
    /** @type {import('cypress')} */
    cy.intercept('PUT', '/api/*/settings').as('putSettings')
    cy.request({
        method: 'PUT',
        url: '/api/v1/settings',
        body: {
            'user:tcs-url': '',
            'user:tcs-date': null,
            'user:tcs-required': false
        }
    }).then((response) => {
        expect(response.status).to.eq(200)
    })
})
