describe('FlowForge - Templates', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/templates')

        // wait until two Stacks API calls complete
        cy.intercept('GET', '/api/*/templates?*').as('getTemplates')
        cy.wait('@getTemplates')
    })

    it('loads templates into the data table', () => {
        cy.get('[data-el="templates"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="templates"] tbody').contains('td', 'template1')
    })

    it('can delete a template from the table', () => {
        cy.intercept('DELETE', '/api/*/templates/*').as('deleteTemplate')
        // add a template that we will then delete
        cy.request('POST', '/api/v1/templates', { name: 'New Template', settings: { disableEditor: false, httpAdminRoot: '', codeEditor: 'monaco', theme: 'forge-light', page: { title: 'FlowForge', favicon: '' }, header: { title: 'FlowForge', url: '' }, timeZone: 'UTC', palette: { allowInstall: true, nodesExcludes: '', denyList: [] }, modules: { allowInstall: true, denyList: [] }, env: [] }, policy: { disableEditor: false, httpAdminRoot: false, codeEditor: false, theme: false, page: { title: false, favicon: false }, header: { title: false, url: false }, timeZone: false, palette: { allowInstall: false, nodesExcludes: false, denyList: false }, modules: { allowInstall: false, denyList: false } } })

        cy.visit('/admin/templates')

        // wait until two Stacks API calls complete
        cy.intercept('GET', '/api/*/templates?*').as('getTemplates')
        cy.wait('@getTemplates')

        // check we have two templates
        cy.get('[data-el="templates"] tbody').find('tr').should('have.length', 2)

        cy.get('[data-el="templates"] tbody').find('.ff-kebab-menu').eq(1).click()
        cy.get('[data-el="templates"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(1).click()

        cy.get('.ff-dialog-box').should('be.visible')

        // confirm deletion
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--danger').click()

        // wait for deletion to finish
        cy.wait('@deleteTemplate')

        // check it has been deleted
        cy.get('[data-el="templates"] tbody').find('tr').should('have.length', 1)
    })

    it('can not delete a template from the table if template is in use', () => {
        cy.intercept('DELETE', '/api/*/templates/*').as('deleteTemplate')
        // add a template that we will then delete
        cy.request('POST', '/api/v1/templates', { name: 'New Template', settings: { disableEditor: false, httpAdminRoot: '', codeEditor: 'monaco', theme: 'forge-light', page: { title: 'FlowForge', favicon: '' }, header: { title: 'FlowForge', url: '' }, timeZone: 'UTC', palette: { allowInstall: true, nodesExcludes: '', denyList: [] }, modules: { allowInstall: true, denyList: [] }, env: [] }, policy: { disableEditor: false, httpAdminRoot: false, codeEditor: false, theme: false, page: { title: false, favicon: false }, header: { title: false, url: false }, timeZone: false, palette: { allowInstall: false, nodesExcludes: false, denyList: false }, modules: { allowInstall: false, denyList: false } } })

        cy.visit('/admin/templates')

        // wait until two Stacks API calls complete
        cy.intercept('GET', '/api/*/templates?*').as('getTemplates')
        cy.wait('@getTemplates')

        // check we have two templates
        cy.get('[data-el="templates"] tbody').find('tr').should('have.length', 2)

        cy.get('[data-el="templates"] tbody').find('.ff-kebab-menu').eq(0).click()
        cy.get('[data-el="templates"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(1).click()

        cy.get('.ff-dialog-box').should('be.visible')

        // check that the "Delete" button is disabled
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--danger').contains('Delete').should('be.disabled')
    })
})
