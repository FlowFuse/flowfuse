/**
 * This file is currently naively copied from the projects test coverage
 * As such some tests may be out of date
 */
describe('FlowForge - Instances', () => {
    function navigateToInstances (teamName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                cy.visit(`/team/${team.slug}/instances`)
            })
    }
    function navigateToInstance (teamName, projectName) {
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
                cy.visit(`/instance/${project.id}`)
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/instance-types')
        cy.wait('@getInstanceTypes')
    })

    it.skip('can be navigated to from team page', () => {
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.visit('/')

        cy.get('[data-nav="team-applications"]')

        cy.wait('@getTeamApplications')

        cy.get('[data-action="view-application"]').contains('application-1').click()

        cy.wait('@getApplication')

        cy.get('[data-el="cloud-instances"] tr').contains('instance-1-1').click()

        cy.wait('@getInstance')

        cy.get('[data-el="instances-section"]').should('exist')
        cy.get('[data-el="banner-project-as-admin"]').should('not.exist')
        cy.get('[data-action="open-editor"]').should('exist')
        cy.get('[data-el="editor-link"]').should('exist')
    })

    it.skip('can be deleted', () => {
        const INSTANCE_NAME = `new-instance-${Math.random().toString(36).substring(2, 7)}`

        cy.intercept('DELETE', '/api/*/projects/*').as('deleteInstance')

        let team, application, template, stack, type

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
                return cy.request('GET', `api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                application = response.body.applications[0]
                return cy.request('GET', `api/v1/stacks?projectType=${type.id}`)
            })
            .then((response) => {
                stack = response.body.stacks[0]
                return cy.request('POST', '/api/v1/projects', {
                    name: INSTANCE_NAME,
                    stack: stack.id,
                    template: template.id,
                    billingConfirmation: false,
                    projectType: type.id,
                    team: team.id,
                    applicationId: application.id
                })
            })
            .then((response) => {
                cy.intercept('GET', '/api/*/projects/*').as('getInstance')

                const project = response.body
                cy.visit(`/instance/${project.id}/settings`)
                cy.wait('@getInstance')

                cy.get('[data-el="delete-instance-dialog"]').should('not.be.visible')
                cy.get('button[data-action="delete-instance"]').click()

                cy.get('[data-el="delete-instance-dialog"]')
                    .should('be.visible')
                    .within(() => {
                        // Dialog is open
                        cy.get('.ff-dialog-header').contains('Delete Instance')

                        // main button should be disabled
                        cy.get('button.ff-btn.ff-btn--danger').should('be.disabled')
                        cy.get('[data-form="instance-name"] input[type="text"]').type(INSTANCE_NAME)

                        // should now be enabled again
                        cy.get('button.ff-btn.ff-btn--danger').click()
                    })

                cy.wait('@deleteInstance')

                cy.url().should('include', `/application/${application.id}/instances`)
            })
    })

    it.skip('can be updated', () => {
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')

        navigateToInstance('ATeam', 'instance-1-1')

        cy.get('[data-nav="instance-settings"]').click()
        cy.get('[data-nav="general"]').click()
        cy.get('[data-nav="change-instance-settings"]').click()

        cy.intercept('PUT', '/api/*/projects/*').as('updateInstance')
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')

        // Scoped as there are multiple dialogs on the page
        cy.get('[data-el="change-project"]').within(($form) => {
            // No changes to form yet
            cy.get('[data-action="update-project"]').should('be.disabled')

            cy.get('[data-form="project-name"] input').should('be.disabled').should(($input) => {
                const projectName = $input.val()
                expect(projectName).to.equal('instance-1-1')
            })

            cy.get('[data-form="instance-stack"]').contains('stack2').click()
            cy.get('[data-action="update-project"]').should('not.be.disabled') // changes _have_ now been made

            cy.get('[data-form="instance-stack"]').contains('stack1').click() // re-select
            cy.get('[data-action="update-project"]').should('be.disabled')

            cy.get('[data-form="project-type"]').contains('type2').click()

            cy.get('[data-form="project-template"]').should('not.exist') // template section is hidden for edit

            cy.get('[data-action="update-project"]').should('not.be.disabled').click()
        })

        cy.wait('@updateInstance')
        cy.wait('@getInstance')

        cy.contains('instance-1-1')
        cy.contains('type2 / stack1-for-type2')

        // Put it back how it was
        cy.get('[data-nav="instance-settings"]').click()
        cy.get('[data-nav="general"]').click()
        cy.get('[data-nav="change-instance-settings"]').click()

        cy.get('[data-el="change-project"]').within(($form) => {
            cy.get('[data-form="project-type"]').contains('type1').click()
            cy.get('[data-action="update-project"]').click()
        })

        cy.wait('@updateInstance')
        cy.wait('@getInstance')

        cy.contains('instance-1-1')
        cy.contains('type1 / stack1')
    })

    it.skip('can be copied', () => {
        // TODO needs work as currently lands user on Project Overview rather than Index View
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')
        cy.intercept('POST', '/api/*/projects').as('createProject')
        cy.intercept('GET', '/api/*/applications/*/instances').as('getApplicationInstances')

        cy.visit('/')

        navigateToInstance('ATeam', 'instance-1-1')

        cy.wait('@getInstance')

        cy.get('[data-nav="instance-settings"]').click()
        cy.get('[data-nav="general"]').click()
        cy.get('[data-nav="copy-project"]').click()

        // Does not use same name
        cy.get('[data-form="project-name"] input').should(($input) => {
            const projectName = $input.val()
            expect(projectName).not.to.be.equal('instance-1-1')
        })

        cy.get('[data-action="create-project"]').click()
        cy.wait('@createProject')

        cy.wait('@getApplicationInstances')

        cy.get('[data-el="cloud-instances"] tr:last').click()

        cy.wait('@getInstance')

        cy.contains('type1 / stack1')
    })

    it('can be created', () => {
        cy.intercept('POST', '/api/*/projects').as('createInstance')
        const INSTANCE_NAME = `new-instance-${Math.random().toString(36).substring(2, 7)}`

        navigateToInstances('ATeam')
        cy.get('[data-action="create-project"]').click()
        cy.url().should('include', '/ateam/instances/create')

        cy.get('[data-action="create-project"]').should('be.disabled')

        // select application
        cy.get('[data-form="application-id"]').click()
        cy.get('[data-form="application-id"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-form="application-id"] .ff-dropdown-options > .ff-dropdown-option:first').click()

        // give instance a name
        cy.get('[data-form="project-name"] input').clear()
        cy.get('[data-form="project-name"] input').type(INSTANCE_NAME)

        // select instance type
        cy.get('[data-form="project-type"]').contains('type1').click()

        // select stack
        cy.get('[data-form="instance-stack"]').contains('stack1').click() // de-select
        cy.get('[data-action="create-project"]').should('be.disabled')
        cy.get('[data-form="instance-stack"]').contains('stack1').click() // re-select

        cy.get('[data-form="project-template"]').should('exist') // template section visible for create

        cy.get('[data-action="create-project"]').should('not.be.disabled').click()

        cy.wait('@createInstance')
            .then((interception) => {
                const instanceid = interception.response.body.id

                cy.url().should('include', `/instance/${instanceid}/overview`)

                cy.contains(INSTANCE_NAME)
                cy.contains('application-1')
            })
    })

    it('redirects to "Create Application" when a user clicks "Create Instance" and no applications are yet created', () => {
        cy.intercept('GET', '/api/*/teams/*/applications', {
            applications: []
        }).as('getApplications')

        navigateToInstances('ATeam')

        cy.get('[data-action="create-project"]').click()
        cy.url().should('include', '/ateam/applications/create')
    })
})
