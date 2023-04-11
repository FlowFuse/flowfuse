describe('FlowForge - Instance Settings - DevOps', () => {
    function navigateToInstanceStaging (teamName, projectName) {
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
                cy.visit(`/instance/${project.id}/settings/devops`)
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/projects/').as('getProjects')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('allow the selection of a target project from a list of all projects in the team', () => {
        navigateToInstanceStaging('BTeam', 'instance-2-1')

        // buttons should be disabled
        cy.get('[data-action="push-stage"]').should('be.disabled')
        cy.get('[data-action="view-target-project"]').should('be.disabled')

        cy.get('[data-el="target-project"] .ff-dropdown-options').should('not.be.visible')
        cy.get('[data-el="target-project"] .ff-dropdown').click()
        cy.get('[data-el="target-project"] .ff-dropdown-options').should('be.visible')

        cy.get('[data-el="target-project"] .ff-dropdown-options > .ff-dropdown-option').eq(0).contains('instance-2-with-devices').should('be.visible')
        cy.get('[data-el="target-project"] .ff-dropdown-options > .ff-dropdown-option').eq(0).click()

        cy.get('[data-action="push-stage"]').should('not.be.disabled')
        cy.get('[data-action="view-target-project"]').should('not.be.disabled')

        cy.get('[data-action="push-stage"]').click()

        cy.get('.ff-dialog-header').contains('Push to "instance-2-with-devices"')
        cy.get('.ff-dialog-box .ff-btn--primary').contains('Confirm').click()
    })

    it('successfully navigates to the Target Project when the option is selected', () => {
        navigateToInstanceStaging('BTeam', 'instance-2-1')

        // buttons should be disabled
        cy.get('[data-action="push-stage"]').should('be.disabled')
        cy.get('[data-action="view-target-project"]').should('be.disabled')

        cy.get('[data-el="target-project"] .ff-dropdown-options').should('not.be.visible')
        cy.get('[data-el="target-project"] .ff-dropdown').click()
        cy.get('[data-el="target-project"] .ff-dropdown-options').should('be.visible')

        cy.get('[data-el="target-project"] .ff-dropdown-options > .ff-dropdown-option').eq(0).contains('instance-2-with-devices').should('be.visible')
        cy.get('[data-el="target-project"] .ff-dropdown-options > .ff-dropdown-option').eq(0).click()

        cy.get('[data-action="push-stage"]').should('not.be.disabled')
        cy.get('[data-action="view-target-project"]').should('not.be.disabled')

        cy.get('[data-action="view-target-project"]').click()

        cy.get('[data-el="instance-name"]').contains('instance-2-with-devices')
    })
})

describe('FlowForge shows audit logs', () => {
    function navigateToProjectActivity (teamName, projectName) {
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
        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('for when a project is pushed to next stage', () => {
        navigateToProjectActivity('BTeam', 'instance-2-1')
        cy.get('.ff-audit-entry').contains('Instance Copied')
    })

    it('for when a project is imported', () => {
        navigateToProjectActivity('BTeam', 'instance-2-with-devices')
        cy.get('.ff-audit-entry').contains('Instance Imported')
    })
})
