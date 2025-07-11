/**
 * This file is currently naively copied from the projects test coverage
 * As such some tests may be out of date
 */

describe('FlowFuse - Instances', () => {
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

    it('can be navigated to from team page', () => {
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.visit('/')

        cy.get('[data-nav="team-applications"]').click()

        cy.wait('@getTeamApplications')

        cy.get('[data-action="view-application"]').contains('application-1').click()

        cy.wait('@getApplication')

        cy.get('[data-el="cloud-instances"] tr').contains('instance-1-1').click()

        cy.wait('@getInstance')

        cy.get('[data-el="banner-project-as-admin"]').should('not.exist')
        cy.get('[data-action="open-editor"]').should('exist')
        cy.get('[data-el="editor-link"]').should('exist')
    })

    it('can be deleted', () => {
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
                    .get('.ff-dialog-container.ff-dialog-container--open')
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

                cy.url().should('include', `/applications/${application.id}/instances`)
            })
    })

    it('can be updated', () => {
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

            // can't use .select('value') because we're not dealing with a select input
            cy.get('[data-el="stack-selector"]').click()
        })

        cy.get('[data-el="listbox-options"]').contains('stack 2').click()

        cy.get('[data-el="change-project"]').within(($form) => {
            cy.get('[data-action="update-project"]').should('not.be.disabled') // changes _have_ now been made
        })

        cy.get('[data-el="stack-selector"]').click()
        cy.get('[data-el="listbox-options"]').contains('stack 1').click() // re-select

        cy.get('[data-el="change-project"]').within(($form) => {
            cy.get('[data-action="update-project"]').should('be.disabled')

            cy.get('[data-form="project-type"]').contains('type2').click()

            cy.get('[data-form="project-template"]').should('not.exist') // template section is hidden for edit

            cy.get('[data-action="update-project"]').should('not.be.disabled').click()
        })

        cy.wait('@updateInstance')
        cy.wait('@getInstance')

        cy.contains('instance-1-1')
        cy.contains('type2 / stack 1 for type2')

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
        cy.contains('type1 / stack 1')
    })

    it('can be copied', () => {
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')
        cy.intercept('POST', '/api/*/projects').as('createProject')

        cy.visit('/')

        navigateToInstance('ATeam', 'instance-1-2')

        cy.wait('@getInstance')

        cy.get('[data-nav="instance-settings"]').click()
        cy.get('[data-nav="general"]').click()
        cy.get('[data-nav="copy-project"]').click()

        cy.get('[data-step="duplication"]').should('exist')

        // Does not use same name
        cy.get('[data-form="project-name"] input').should(($input) => {
            const projectName = $input.val()
            expect(projectName).not.to.be.equal('instance-1-1')
        })

        cy.get('[data-el="application-name"]').contains('application-1')

        // not present if the application doesn't have a description
        cy.get('[data-el="application-description"]').should('not.exist')

        cy.get('[data-el="instance-name"]').should('not.contain', 'instance-1-2')

        cy.get('[data-el="instance-type-name"]').contains('type1')
        cy.get('[data-el="instance-type-description"]').contains('project type description')

        cy.get('[data-el="node-red-version"]').contains('stack 2')
        cy.get('[data-el="template-name"]').contains('template1')

        cy.get('[data-el="next-step"]').click()

        cy.wait('@createProject')
        cy.wait('@getInstance')

        cy.contains('Application: application-1')

        cy.contains('type1 / stack 2')
        cy.contains('template1')
    })

    it('can be created', () => {
        cy.intercept('POST', '/api/*/projects').as('createInstance')
        cy.intercept('GET', 'api/v1/project-types', (req) => req.reply(res => {
            const disabledInstance = {
                id: 'kRPW9AWzmw',
                name: 'Disabled Instance Type',
                active: true,
                disabled: true,
                description: 'disabled project type description',
                order: 1,
                properties: {},
                createdAt: '2024-05-27T10:59:36.469Z',
                defaultStack: null,
                instanceCount: 9,
                stackCount: 2
            }
            res.body = {
                ...res.body,
                ...{
                    types: [
                        ...res.body.types,
                        disabledInstance
                    ]
                }
            }
            return res
        })).as('getProjectTypes')
        const INSTANCE_NAME = `new-instance-${Math.random().toString(36).substring(2, 7)}`

        navigateToInstances('ATeam')
        cy.get('[data-action="create-project"]').click()

        // move along the multi-step form
        cy.get('[data-el="application-item"]').first().click()

        // set the new instance name
        cy.get('[data-el="instance-name"] input').clear()
        cy.get('[data-el="instance-name"] input').type(INSTANCE_NAME)

        // select instance type
        cy.get('[data-form="project-type"] [data-item="tile-selection-option"]').first().click()

        // select template
        cy.get('[data-group="templates"] [data-item="tile-selection-option"]').first().click()

        // select nr-version
        cy.get('[data-form="multi-step-form"] [data-el="node-red-listbox"]').click()
        cy.get('[data-option="stack 1"]').click()

        cy.get('[data-el="next-step"]').click()

        cy.wait('@getProjectTypes')

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
