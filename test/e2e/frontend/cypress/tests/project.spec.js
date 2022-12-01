describe('FlowForge - Projects', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/project-types*').as('getProjectTypes')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/project-types')
        cy.wait('@getProjectTypes')
    })

    it('can be viewed', () => {
        cy.intercept('GET', '/api/*/projects/*').as('getProject')

        cy.visit('/')

        cy.get('[data-nav="team-projects"]')

        cy.wait('@getTeamProjects')

        cy.contains('project1').click()

        cy.wait('@getProject')

        cy.get('[data-el="banner-project-as-admin"]').should('not.exist')

        cy.get('[data-action="open-editor"]').should('exist')
        cy.get('[data-el="editor-link"]').should('exist')
    })

    it('can be deleted', () => {
        const PROJECT_NAME = 'my-project'

        cy.intercept('DELETE', '/api/*/projects/*').as('deleteProject')

        let team, template, stack, type

        cy.request('GET', 'api/v1/teams')
            .then((response) => {
                team = response.body.teams[0]
                return cy.request('GET', 'api/v1/templates')
            })
            .then((response) => {
                template = response.body.templates[0]
                return cy.request('GET', 'api/v1/project-types')
            })
            .then((response) => {
                type = response.body.types[0]
                return cy.request('GET', `api/v1/stacks?projectType=${type.id}`)
            })
            .then((response) => {
                stack = response.body.stacks[0]
                return cy.request('POST', '/api/v1/projects', {
                    name: PROJECT_NAME,
                    stack: stack.id,
                    template: template.id,
                    billingConfirmation: false,
                    projectType: type.id,
                    team: team.id
                })
            })
            .then((response) => {
                cy.intercept('GET', '/api/*/projects/*').as('getProject')
                const project = response.body
                cy.visit(`/project/${project.id}/settings/danger`)
                cy.wait('@getProject')

                cy.get('[data-el="delete-project"]').should('not.be.visible')
                cy.get('button[data-action="delete-project"]').click()
                cy.get('[data-el="delete-project"]').should('be.visible')
                cy.get('.ff-dialog-header').contains('Delete Project')

                // main button should be disabled
                cy.get('[data-el="delete-project"] button.ff-btn.ff-btn--danger').should('be.disabled')
                cy.get('[data-el="delete-project"]').should('be.visible')
                cy.get('.ff-dialog-header').contains('Delete Project')

                cy.get('[data-el="delete-project"] [data-form="project-name"] input[type="text"]').type(PROJECT_NAME)

                // should now be enabled again
                cy.get('[data-el="delete-project"] button.ff-btn.ff-btn--danger').click()
                cy.wait('@deleteProject')

                cy.url().should('include', `/team/${team.slug}/overview`)
            })
    })
})

describe('FlowForge stores audit logs for a project', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/team/ateam/audit-log')
    })

    it('when it is created', () => {
        cy.get('.ff-audit-entry').contains('Project Created')
    })

    it('when it is deleted', () => {
        cy.get('.ff-audit-entry').contains('Project Deleted')
    })
})
