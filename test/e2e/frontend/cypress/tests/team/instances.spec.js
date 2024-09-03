describe('Team - Instances', () => {
    it('correctly displays the open editor button', () => {
        cy.login('bob', 'bbPassword')
        cy.home()

        cy.get('[data-nav="team-instances"]').click()
        cy.contains('instance-1-1')
            .parent()
            .parent()
            .parent()
            .within(() => {
                // checking for ara-disabled because somehow should.be.enabled always returns true no matter the btn state
                cy.get('[data-action="open-editor"]').should('not.have.attr', 'aria-disabled')
            })
        cy.contains('instance-1-2')
            .parent()
            .parent()
            .parent()
            .within(() => {
                // checking for ara-disabled because somehow should.be.enabled always returns true no matter the btn state
                cy.get('[data-action="open-editor"]').should('have.attr', 'aria-disabled', 'true')
            })
    })

    it('correctly displays the dashboard button', () => {
        cy.login('bob', 'bbPassword')
        cy.home()

        cy.intercept(
            'GET',
            '/api/*/teams/*/projects',
            req => req.reply(res => {
                res.send({
                    projects: res.body.projects.map(instance => ({ ...instance, ...{ settings: { dashboard2UI: '/dashboard' } } }))
                })
            })
        ).as('getProjects')

        cy.get('[data-nav="team-instances"]').click()

        cy.wait('@getProjects')

        cy.contains('instance-1-1')
            .parent()
            .parent()
            .parent()
            .within(() => {
                // checking for ara-disabled because somehow should.be.enabled always returns true no matter the btn state
                cy.get('[data-action="open-dashboard"]').should('not.have.attr', 'aria-disabled')
            })
        cy.contains('instance-1-2')
            .parent()
            .parent()
            .parent()
            .within(() => {
                // checking for ara-disabled because somehow should.be.enabled always returns true no matter the btn state
                cy.get('[data-action="open-dashboard"]').should('have.attr', 'aria-disabled', 'true')
            })
    })
})
