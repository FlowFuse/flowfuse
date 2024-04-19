describe('FlowForge - Library', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    describe('Blueprints', () => {
        it('should load the Library page and display the unavailable feature banner for the Blueprints tab', () => {
            cy.visit('team/ateam/library')

            cy.get('div[data-el="page-name"]').contains('Library')
            cy.contains('Shared repository to store common flows and nodes.')
            cy.contains('Create your own Blueprints')
            cy.contains('This is a FlowFuse Premium feature. Please upgrade your instance of FlowFuse in order to use it.')
        })
    })
    describe('Team Library', () => {
        it('should load the Library page and display the unavailable feature banner for Team Library tab', () => {
            cy.visit('team/ateam/library')

            cy.get('a.ff-tab-option').contains('Team Library').click()
            cy.contains('Create your own Team Library')
            cy.contains('This is a FlowFuse Premium feature. Please upgrade your instance of FlowFuse in order to use it.')
        })
    })
})
