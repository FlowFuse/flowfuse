import 'cypress-mailpit'

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

Cypress.Commands.add('logout', () => {
    // clear Cypress session, and logout from FlowForge
    cy.session([null, null], () => {
        cy.request('post', '/account/logout')
    })
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
    cy.intercept('/api/*/teams/*/applications*').as('getTeamApplications')
    cy.intercept('/api/*/user/invitations').as('getInvitations')

    cy.intercept('/api/*/admin/stats').as('getAdminStats')
    cy.intercept('/api/*/admin/license').as('getAdminLicense')

    cy.visit('/')

    cy.wait('@getUser')
    cy.wait('@getSettings')
    cy.wait('@getTeam')
    cy.wait('@getTeams')
    cy.wait('@getTeamRole')
    cy.wait('@getInvitations')

    cy.url().should('include', '/overview')
})

Cypress.Commands.add('enableBilling', () => {
    cy.intercept('/api/*/settings', (req) => {
        req.reply((response) => {
            response.body.features.billing = true
            return response
        })
    }).as('getSettings')

    cy.intercept('/api/*/teams/slug/*', (req) => {
        req.reply((response) => {
            response.body.billing = {
                active: true
            }
            return response
        })
    }).as('getTeamBySlug')

    cy.intercept('/api/*/teams/*', (req) => {
        req.reply((response) => {
            response.body.billing = {
                active: true
            }
            return response
        })
    }).as('getTeam')

    cy.intercept('GET', '/api/*/project-types*', (req) => {
        req.reply((response) => {
            response.body.types[0].properties.billingProductId = 'prod_1234567890'
            response.body.types[0].properties.billingPriceId = 'price_1234567890'
            response.body.types[0].properties.billingDescription = '$15/month'
            return response
        })
    }).as('getProjectTypes')
})

Cypress.Commands.add('applyBillingCreditToTeam', (amountInCents) => {
    const oneMonthAway = Math.floor((new Date()).setMonth(new Date().getMonth() + 1) / 1000)
    cy.intercept('/ee/billing/teams/*', {
        next_billing_date: oneMonthAway,
        items: [
            {
                name: 'Team Plan',
                price: 0,
                quantity: 1
            }
        ],
        customer: {
            name: 'Padmé Amidala',
            balance: -amountInCents
        }
    }).as('getTeamBilling')
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

/**
 * Test an element is within the viewport
 * @example cy.get('selector').isInViewport().click()
 */
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
    const bottom = Cypress.$(cy.state('window')).height()
    const rect = subject[0].getBoundingClientRect()

    expect(rect.top).not.to.be.greaterThan(bottom)
    expect(rect.bottom).not.to.be.greaterThan(bottom)

    return subject
})

Cypress.Commands.add('clearBrowserData', () => {
    cy.clearCookies()
    cy.clearLocalStorage()
    cy.window().then((win) => {
        win.sessionStorage.clear()
    })
})

Cypress.Commands.add('isEmailEnabled', () => {
    cy.login('alice', 'aaPassword')

    cy.visit('/admin/settings/email')

    // wait for the page to render
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000)

    // eslint-disable-next-line cypress/require-data-selectors
    return cy.get('body').then(($body) => {
        const isDisabled = $body.text().includes('Email is not currently configured for the platform.')

        cy.logout()
        cy.clearBrowserData()

        return cy.wrap(!isDisabled)
    })
})

// Convenience commands that use an admin user to change global platform settings
Cypress.Commands.add('adminEnableSignUp', () => {
    cy.login('alice', 'aaPassword')

    cy.url()
        .then((currentUrl) => {
            if (!currentUrl.includes('/admin/settings/general')) {
                cy.visit('/admin/settings/general')
            }
        })
        .then(() => cy.get('[data-el="enable-signup"] input'))
        .then(($checkbox) => {
            if (!$checkbox.is(':checked')) {
                cy.get('[data-el="enable-signup"] .ff-checkbox').click()
                cy.get('[data-action="save-settings"]').click()
            }
        })

    cy.logout()
    cy.clearBrowserData()
})
Cypress.Commands.add('adminDisableSignUp', () => {
    cy.login('alice', 'aaPassword')

    cy.url()
        .then((currentUrl) => {
            if (!currentUrl.includes('/admin/settings/general')) {
                cy.visit('/admin/settings/general')
            }
        })
        .then(() => cy.get('[data-el="enable-signup"] input'))
        .then(($checkbox) => {
            if ($checkbox.is(':checked')) {
                cy.get('[data-el="enable-signup"] .ff-checkbox').click()
                cy.get('[data-action="save-settings"]').click()
            }
        })

    cy.logout()
    cy.clearBrowserData()
})

Cypress.Commands.add('adminEnableTeamAutoCreate', () => {
    cy.login('alice', 'aaPassword')

    cy.url()
        .then((currentUrl) => {
            if (!currentUrl.includes('/admin/settings/general')) {
                cy.visit('/admin/settings/general')
            }
        })
        .then(() => cy.get('[data-el="team-auto-create"] input'))
        .then($checkbox => {
            if (!$checkbox.is(':checked')) {
                cy.get('[data-el="team-auto-create"] .ff-checkbox')
                    .click()
                cy.get('[data-action="save-settings"]')
                    .click()
            }
        })

    cy.logout()
    cy.clearBrowserData()
})
Cypress.Commands.add('adminDisableTeamAutoCreate', () => {
    cy.login('alice', 'aaPassword')

    cy.url()
        .then((currentUrl) => {
            if (!currentUrl.includes('/admin/settings/general')) {
                cy.visit('/admin/settings/general')
            }
        })
        .then(() => cy.get('[data-el="team-auto-create"] input'))
        .then($checkbox => {
            if ($checkbox.is(':checked')) {
                cy.get('[data-el="team-auto-create"] .ff-checkbox').click()
                cy.get('[data-action="save-settings"]').click()
            }
        })

    cy.logout()
    cy.clearBrowserData()
})

Cypress.Commands.add('adminGetAllBlueprints', () => {
    cy.login('alice', 'aaPassword')

    cy.intercept('GET', '/api/*/flow-blueprints*').as('getAllBlueprints')
    cy.visit('/admin/flow-blueprints')
    cy.wait('@getAllBlueprints')
        .then(interception => interception.response.body.blueprints)
        .then(blueprints => {
            cy.wrap(blueprints).as('allBlueprints')
        })

    cy.logout()
    cy.clearBrowserData()
})
