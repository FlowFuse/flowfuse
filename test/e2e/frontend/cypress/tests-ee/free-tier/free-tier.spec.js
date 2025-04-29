describe('FlowFuse EE - Free Tier', () => {
    beforeEach(() => {
        cy.login('freddie', 'ffPassword')
        cy.home()
    })

    it('shows that Hosted Instances are a premium feature in the side navigation', () => {
        cy.get('[data-nav="team-instances"]').get('[data-el="premium-feature"]').should('exist')
    })

    it('shows that Hosted Instances are a premium feature when on the /team/<teamId>/instances page', () => {
        cy.get('[data-nav="team-instances"]').click()
        cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('exist')
    })

    it('redirects to /application/devices after creating an Application when Hosted Instances are not enabled', () => {
        cy.get('[data-action="create-application"]').first().click()
        cy.get('[data-form="application-name"] input[type="text"]').type('My Application')
        cy.get('[data-el="next-step"]').click()
        cy.url().should('include', '/devices')
    })
})
