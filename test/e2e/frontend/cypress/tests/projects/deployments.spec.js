describe('FlowForge - Project Deployments', () => {
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
                cy.visit(`/project/${project.id}/devices`)
                cy.wait('@getProjectDeployments')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*/devices').as('getProjectDeployments')
        cy.intercept('GET', '/api/*/projects/*/snapshots').as('getProjectSnapshots')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('shows a placeholder message when no devices have been added to the project', () => {
        navigateToProject('BTeam', 'project2')

        cy.get('[data-el="devices-section"]').contains('You have not added any devices to this project yet.')
    })

    it('provides functionality to assign a snapshot', () => {
        navigateToProject('BTeam', 'project-with-devices')

        cy.get('[data-action="change-target-snapshot"]').contains('none')

        cy.get('button[data-action="change-target-snapshot"]').click()

        cy.get('[data-el="snapshot-assign-dialog"]').should('be.visible')
        cy.get('[data-el="snapshot-assign-dialog"] .ff-btn--primary').should('be.disabled')

        cy.get('[data-form="snapshot-select"]').click()
        cy.get('[data-form="snapshot-select"] .ff-dropdown-option:first').click()

        // Button enabled
        cy.get('[data-el="snapshot-assign-dialog"] .ff-btn--primary').should('not.be.disabled')

        // Click Assign
        cy.get('[data-el="snapshot-assign-dialog"] .ff-btn--primary').click()

        cy.get('[data-action="change-target-snapshot"]').contains('snapshot 3')

        // Dialog updates
        cy.get('button[data-action="change-target-snapshot"]').click()
        cy.get('[data-form="snapshot-select"]').click()
        cy.get('[data-form="snapshot-select"] .ff-dropdown-options').contains('snapshot 3 (active)')
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
                cy.visit(`/project/${project.id}/activity`)
            })
    }

    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.home()
        navigateToProject('BTeam', 'project-with-devices')
    })

    it('for when a snapshot is set as the device target', () => {
        cy.get('.ff-audit-entry').contains('Device Target Set')
    })
})
