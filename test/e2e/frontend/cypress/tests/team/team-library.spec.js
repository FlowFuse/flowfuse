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

    // it.only('', () => {
    // cy.intercept('/api/*/flow-blueprints?*', { meta: {}, count: 2, blueprints: [{ id: 'yJR1DQ9NbK', active: true, name: 'My first Blueprint', description: 'My first team', category: 'Basic Blueprint', icon: 'cog', order: 1, default: false, createdAt: '2024-04-16T15:14:16.780Z', updatedAt: '2024-04-17T08:02:35.066Z' }, { id: 'v0J85bLeA5', active: true, name: 'Other blueprint (blank)', description: 'some other description', category: 'Some other category', icon: 'briefcase', order: 0, default: true, createdAt: '2024-04-17T08:02:35.065Z', updatedAt: '2024-04-17T08:02:35.065Z' }] })
    //     .as('getBlueprints')
    // cy.wait(['@getBlueprints'])

    // })
})
