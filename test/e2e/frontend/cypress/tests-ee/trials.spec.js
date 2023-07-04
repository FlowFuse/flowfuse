describe('FlowForge - Trial Users', () => {
    beforeEach(() => {
        cy.login('terry', 'ttPassword')
        cy.home()
    })

    it('are informed of their trial status', () => {
        cy.get('[data-el="banner-team-trial"]').should('exist')
    })

    it('should be presented with an empty state on the Applications view', () => {
        cy.get('[data-el="empty-state"] [data-action="create-application"]').click()
    })

    it('are redirected to their (first) newly created application', () => {
        const APPLICATION_NAME = `new-application-${Math.random().toString(36).substring(2, 7)}`
        const INSTANCE_NAME = `new-instance-${Math.random().toString(36).substring(2, 7)}`

        cy.intercept('POST', '/api/*/applications').as('createApplication')
        cy.intercept('POST', '/api/*/projects').as('createInstance')

        cy.get('[data-el="empty-state"] [data-action="create-application"]').click()

        cy.get('[data-action="create-project"]').should('be.disabled')

        cy.get('[data-form="application-name"] input').clear()
        cy.get('[data-form="application-name"] input').type(APPLICATION_NAME)

        // Pre-fills instance name
        cy.get('[data-form="project-name"] input').should(($input) => {
            const projectName = $input.val()
            expect(projectName.length).to.be.above(0)
        })

        cy.get('[data-form="project-name"] input').clear()
        cy.get('[data-form="project-name"] input').type(INSTANCE_NAME)

        cy.get('[data-action="create-project"]').should('not.be.disabled').click()

        cy.url().should('include', '/instances')
    })

    it('cannot create a second instance', () => {
        cy.get('[data-action="view-application"]').click()
        cy.get('[data-action="create-instance"]').click()

        cy.url().should('include', 'team/tteam/billing')
    })
})
