describe('FlowForge - Project - Overview', () => {
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
                cy.visit(`/project/${project.id}/instances`)
                cy.wait('@getProjectDevices')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/*/devices').as('getProjectDevices')
        cy.intercept('GET', '/api/*/projects/*/snapshots').as('getProjectSnapshots')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('shows a placeholder message when no devices have been added to the project', () => {
        navigateToProject('BTeam', 'project2')

        cy.get('[data-el="devices-section"]').get('[data-el="application-no-devices"]').should('exist')
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
