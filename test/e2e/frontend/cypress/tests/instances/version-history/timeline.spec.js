describe('FlowForge - Instance Snapshots', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*/snapshots').as('getProjectSnapshots')

        cy.login('alice', 'aaPassword')
        cy.home()
    })
})
