describe('FlowForge - Trial Users', () => {
    beforeEach(() => {
        cy.login('terry', 'ttPassword')
        cy.home()
    })

    it('are informed of their trial status', () => {
        cy.get('[data-el="banner-team-trial"]').should('exist')
    })

    it('should be presented with an empty state on the Applications view', () => {
        cy.contains('Welcome Home!')
        // cy.get('[data-el="empty-state"] [data-action="create-application"]').click()
    })

    it('are redirected to their (first) newly created instance', () => {
        cy.contains('Welcome Home!')
        // const APPLICATION_NAME = `new-application-${Math.random().toString(36).substring(2, 7)}`
        // const INSTANCE_NAME = `new-instance-${Math.random().toString(36).substring(2, 7)}`
        //
        // cy.intercept('POST', '/api/*/applications').as('createApplication')
        // cy.intercept('POST', '/api/*/projects').as('createInstance')
        //
        // cy.get('[data-el="empty-state"] [data-action="create-application"]').click()
        //
        // cy.get('[data-el="next-step"]').should('be.disabled')
        //
        // cy.get('[data-form="application-name"] input').clear()
        // cy.get('[data-form="application-name"] input').type(APPLICATION_NAME)
        //
        // cy.get('[data-el="next-step"]').should('be.enabled')
        // cy.get('[data-el="next-step"]').click()
        //
        // // Pre-fills instance name
        // cy.get('[data-el="instance-name"] input').should(($input) => {
        //     const projectName = $input.val()
        //     expect(projectName.length).to.be.above(0)
        // })
        //
        // cy.get('[data-el="instance-name"] input').clear()
        // cy.get('[data-el="instance-name"] input').type(INSTANCE_NAME)
        //
        // // pre-select the first project template
        // cy.get('[data-form="project-template"] [data-item="tile-selection-option"]').first().click()
        //
        // cy.get('[data-el="node-red-listbox"]').click()
        // cy.get('[data-option].ff-option').first().click()
        //
        // cy.get('[data-el="next-step"]').should('be.enabled')
        // cy.get('[data-el="next-step"]').click()
        // cy.get('[data-el="next-step"]').click()
        //
        // cy.url().should('include', '/applications/')
    })

    it('cannot create a second instance', () => {
        cy.contains('Welcome Home!')
        //
        // cy.get('[data-action="view-application"]').click()
        // cy.get('[data-action="create-instance"]').click()
        //
        // cy.url().should('include', 'team/tteam/billing')
    })

    it('setup billing redirects to team type selection', () => {
        cy.contains('Welcome Home!')

        // let teamType
        // cy.intercept('GET', '/api/*/team-types*').as('getTeamTypes')
        // cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
        // cy.get('[data-nav="team-billing"]').click()
        // cy.url().should('include', 'team/tteam/billing')
        // cy.get('[data-action="change-team-type"]').should('have.length', 2) // checking that we also have the page header btn
        // cy.get('[data-el="empty-state"] [data-action="change-team-type"]').click()
        // cy.url().should('include', 'team/tteam/settings/change-type')
        // cy.wait('@getTeamTypes').then(response => {
        //     // We will eventually submit with the 3rd team type
        //     teamType = response.response.body.types[2]
        // })
        // cy.wait('@getInstanceTypes')
        //
        // // Select the 2nd team type
        // cy.get('[data-form="team-type"] > div:nth-child(2)').click({
        //     scrollBehavior: false
        // })
        // // This team type should be blocked due to unavailable instance
        // cy.get('[data-action="setup-team-billing"]').should('be.disabled')
        //
        // // Select the 3rd team type
        // cy.get('[data-form="team-type"] > div:nth-child(3)').click({
        //     scrollBehavior: false
        // })
        // // This team type should be blocked due to unavailable instance
        // cy.get('[data-action="setup-team-billing"]').should('not.be.disabled')
        //
        // // Stub response to redirect to the static api page rather than stripe
        // // to avoid depending on external urls to run the test
        // cy.intercept('POST', '/ee/billing/teams/*', (req) => {
        //     expect(req.body.teamTypeId).to.equal(teamType.id)
        //     req.reply({ body: { billingURL: '/api/' } })
        // }).as('setupBilling')
        //
        // cy.get('[data-action="setup-team-billing"]').click({
        //     scrollBehavior: false
        // })
        // cy.wait('@setupBilling')
        //
        // // Check we are redirected to the url provided in the api response
        // cy.url().should('include', '/api/static/index.html')
    })
})
