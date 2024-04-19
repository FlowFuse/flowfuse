describe('FlowForge - Shared Team Library', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('should load the Shared Team library page and display the unavailable feature banner for both Blueprints and Team Library', () => {
        cy.visit('team/ateam/library')

        cy.get('div[data-el="page-name"]').contains('Team Library')
        cy.contains('Shared repository to store common flows and nodes.')
        cy.contains('Create your own Blueprints')
        cy.contains('This is a FlowFuse Premium feature. Please upgrade your instance of FlowFuse in order to use it.')

        cy.get('a.ff-tab-option').contains('Team Library').click()
        cy.contains('Create your own Team Library')
        cy.contains('This is a FlowFuse Premium feature. Please upgrade your instance of FlowFuse in order to use it.')
    })
})
