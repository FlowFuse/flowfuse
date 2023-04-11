const path = require('path')
describe('FlowForge - Instance Snapshots', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*/snapshots').as('getProjectSnapshots')

        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', '/api/v1/teams/')
            .then((response) => {
                const team = response.body.teams[0]
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                cy.visit(`/instance/${response.body.projects[0].id}/snapshots`)
                cy.wait('@getProjectSnapshots')
            })
    })

    it('shows a placeholder message when no snapshots have been created', () => {
        cy.get('main').contains('You have not created any snapshots yet')
    })

    it('provides functionality to create a snapshot', () => {
        cy.get('button[data-action="create-snapshot"]').click()

        cy.get('[data-el="dialog-create-snapshot"]').should('be.visible')
        cy.get('.ff-dialog-header').contains('Create Snapshot')
        // disabled primary button by default
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').should('be.disabled')

        cy.get('[data-form="snapshot-name"] input[type="text"]').type('snapshot1')
        // inserting snapshot name is enough to enable button
        cy.get('[data-el="dialog-create-snapshot"] button.ff-btn.ff-btn--primary').should('not.be.disabled')
        cy.get('[data-form="snapshot-description"] textarea').type('snapshot1 description')

        // click "Create"
        cy.get('[data-el="dialog-create-snapshot"] button.ff-btn.ff-btn--primary').click()

        cy.get('[data-el="snapshots"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="snapshots"] tbody').find('tr').contains('snapshot1')
    })

    it('download snapshot package.json', () => {
        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the 2nd option (Download)
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(1).click()

        const downloadsFolder = Cypress.config('downloadsFolder')
        cy.readFile(path.join(downloadsFolder, 'package.json'))
    })

    it('can delete a snapshot', () => {
        cy.intercept('DELETE', '/api/*/projects/*/snapshots/*').as('deleteSnapshot')

        // click kebab menu in row 1
        cy.get('[data-el="snapshots"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the 4th option (Delete)
        cy.get('[data-el="snapshots"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').eq(3).click()

        cy.get('[data-el="platform-dialog"]').should('be.visible')
        cy.get('[data-el="platform-dialog"] .ff-dialog-header').contains('Delete Snapshot')

        // Click "Delete"
        cy.get('[data-el="platform-dialog"] .ff-btn--danger').click()

        cy.wait('@deleteSnapshot')

        cy.get('main').contains('You have not created any snapshots yet')
    })
})

describe('FlowForge shows audit logs', () => {
    function navigateToProject (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const project = response.body.projects.find(
                    (project) => project.name === projectName
                )
                cy.visit(`/instance/${project.id}/audit-log`)
            })
    }

    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        navigateToProject('ATeam', 'instance-1-1')
    })

    it('for when a snapshot is created', () => {
        cy.get('.ff-audit-entry').contains('Instance Snapshot Created')
    })
    it('for when a snapshot is deleted', () => {
        cy.get('.ff-audit-entry').contains('Instance Snapshot Deleted')
    })
})
