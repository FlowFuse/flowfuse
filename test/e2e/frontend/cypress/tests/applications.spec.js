describe('FlowForge - Applications', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
        cy.intercept('GET', '/api/v1/teams/*/applications*').as('getTeamApplications')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/instance-types')
        cy.wait('@getInstanceTypes')
    })

    describe('can be created', () => {
        it('without error - including instance', () => {
            const ID = Math.random().toString(36).substring(2, 7)
            const APPLICATION_NAME = `new-application-${ID}`
            const APPLICATION_DESCRIPTION = `new-description-${ID}`
            const INSTANCE_NAME = `new-instance-${Math.random().toString(36).substring(2, 7)}`

            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/projects/create`)

                cy.intercept('POST', '/api/*/applications').as('createApplication')
                cy.intercept('POST', '/api/*/projects').as('createInstance')
                cy.intercept('GET', '/api/*/stacks*').as('loadStacks')
                cy.get('[data-el="next-step"]').should('be.disabled')

                cy.get('[data-form="application-name"] input').clear()
                cy.get('[data-form="application-name"] input').type(APPLICATION_NAME)
                cy.get('[data-form="application-description"] textarea').clear()
                cy.get('[data-form="application-description"] textarea').type(APPLICATION_DESCRIPTION)

                cy.get('[data-el="next-step"]').should('be.enabled')
                cy.get('[data-el="next-step"]').click()

                // Pre-fills name
                cy.get('[data-el="instance-name"] input').should(($input) => {
                    const projectName = $input.val()
                    expect(projectName.length).to.be.above(0)
                })

                cy.get('[data-el="instance-name"] input').clear()
                cy.get('[data-el="instance-name"] input').type(INSTANCE_NAME)
                cy.get('[data-el="next-step"]').should('be.disabled')

                cy.get('[data-form="project-type"]').contains('type1').click()
                cy.get('[data-form="project-template"]').contains('template1').click()

                cy.get('[data-el="next-step"]').should('be.disabled')

                cy.wait('@loadStacks')

                cy.get('[data-form="project-template"]').should('exist')

                cy.get('[data-el="next-step"]').should('be.disabled')

                cy.get('[data-el="node-red-listbox"]').click()
                cy.get('[data-option].ff-option').first().click()

                cy.get('[data-el="next-step"]').should('be.enabled')
                cy.get('[data-el="next-step"]').click()

                cy.wait('@createApplication')
                cy.wait('@createInstance')

                cy.contains(APPLICATION_NAME)
                cy.contains(INSTANCE_NAME)

                cy.url().should('include', '/projects/')

                // now navigate to the Projects view and check the description is present alongside the project name
                cy.visit(`/team/${team.slug}/projects`)
                // div.ff-application-list--app should have the app name and description
                cy.get('[data-action="view-application"]').contains(APPLICATION_NAME)
                cy.get('[data-action="view-application"]').contains(APPLICATION_DESCRIPTION)
            })
        })

        it('without an instance', () => {
            const ID = Math.random().toString(36).substring(2, 7)
            const APPLICATION_NAME = `new-application-${ID}`
            const APPLICATION_DESCRIPTION = `new-description-${ID}`

            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/projects/create`)

                cy.intercept('POST', '/api/*/applications').as('createApplication')
                cy.intercept('POST', '/api/*/projects').as('createInstance')
                cy.intercept('GET', '/api/*/stacks*').as('loadStacks')
                cy.get('[data-el="next-step"]').should('be.disabled')
                cy.get('[data-el="next-step"]').should('contain', 'Next')

                cy.get('[data-form="application-name"] input').clear()
                cy.get('[data-form="application-name"] input').type(APPLICATION_NAME)
                cy.get('[data-form="application-description"] textarea').clear()
                cy.get('[data-form="application-description"] textarea').type(APPLICATION_DESCRIPTION)

                cy.get('[data-el="slider-step"]').should('have.length', 2)
                cy.get('[data-el="slider-title"]').should('to.contain', 'Application')
                cy.get('[data-el="slider-title"]').should('to.contain', 'Instance')

                cy.get('[data-form="create-instance"] span.checkbox').click()

                cy.get('[data-el="slider-step"]').should('have.length', 1)
                cy.get('[data-el="slider-title"]').should('to.contain', 'Application')

                cy.get('[data-el="next-step"]').should('be.enabled')
                cy.get('[data-el="next-step"]').should('contain', 'Create Application')

                cy.get('[data-el="next-step"]').should('be.enabled')
                cy.get('[data-el="next-step"]').click()

                cy.wait('@createApplication')

                cy.contains(APPLICATION_NAME)

                cy.url().should('include', '/projects/')
            })
        })

        it('handles instance creation failing gracefully', () => {
            const APPLICATION_NAME = `new-application-${Math.random().toString(36).substring(2, 7)}`
            const IN_USE_INSTANCE_NAME = 'instance-1-9'
            const INSTANCE_NAME = `new-instance-${Math.random().toString(36).substring(2, 7)}`
            let supposedToFail = true

            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/projects/create`)

                cy.intercept('POST', '/api/*/applications').as('createApplication')
                cy.intercept('POST', '/api/*/projects', req => {
                    if (supposedToFail) {
                        supposedToFail = false
                        return req.reply({
                            statusCode: 400,
                            body: { code: 'unexpected_error', error: 'Something happened!' }
                        })
                    } else req.continue()
                }).as('createInstance')

                cy.get('[data-el="next-step"]').should('be.disabled')

                cy.get('[data-form="application-name"] input').clear()
                cy.get('[data-form="application-name"] input').type(APPLICATION_NAME)

                cy.get('[data-el="next-step"]').should('be.enabled')
                cy.get('[data-el="next-step"]').should('contain', 'Next')

                cy.get('[data-el="next-step"]').click()

                cy.get('[data-el="instance-name"] input').clear()
                cy.get('[data-el="instance-name"] input').type(IN_USE_INSTANCE_NAME)

                cy.get('[data-form="project-type"]').contains('type1').click()
                cy.get('[data-form="project-template"]').contains('template1').click()

                cy.get('[data-el="node-red-listbox"]').click()
                cy.get('[data-option].ff-option').first().click()

                cy.get('[data-el="next-step"]').click()

                cy.wait('@createApplication')
                cy.wait('@createInstance')

                cy.intercept('POST', '/api/*/projects').as('createInstance')

                // we need to wait for the notification to appear otherwise cypress will click on it off-screen and break the UI
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                cy.wait(1000)

                cy.contains('Something happened!')
                cy.get('[data-el="notification-alert"] span.ff-notification-toast--close').click()
                // check that the user get redirected back to the instance step after failed instance creation
                cy.get('[data-step="instance"]').should('exist')

                cy.get('[data-el="instance-name"] input').clear()
                cy.get('[data-el="instance-name"] input').type(INSTANCE_NAME)

                cy.get('[data-el="next-step"]').click()

                cy.wait('@createInstance')

                cy.contains(APPLICATION_NAME)
                cy.contains(INSTANCE_NAME)
            })
        })

        it('should have a back button', () => {
            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/projects/create`)

                cy.url().should('contain', '/projects/create')

                cy.get('[data-nav="back"]').should('exist')
                cy.get('[data-nav="back"]').contains('Back to Dashboard')

                cy.get('[data-nav="back"]').click()

                cy.url().should('match', /^.*\/team\/.*\/projects/)
            })
        })
    })

    it('can be viewed', () => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.visit('/')

        cy.get('[data-nav="team-projects"]').click()

        cy.wait('@getTeamApplications')

        cy.contains('application-1').click()

        cy.wait('@getApplication')

        cy.get('[data-el="banner-project-as-admin"]').should('not.exist')

        cy.get('[data-action="open-editor"]').should('exist')
    })

    it('are not permitted to have a duplicate project name during creation', () => {
        cy.request('GET', 'api/v1/teams', { failOnStatusCode: false }).then((response) => {
            const team = response.body.teams[0]
            // we need at least one blueprint to show the blueprints step
            cy.intercept('GET', '/api/*/flow-blueprints?filter=active&team=*', {
                meta: {},
                count: 1,
                blueprints: [
                    {
                        id: 'yJR1DQ9NbK',
                        active: true,
                        name: 'My first Blueprint',
                        description: 'My first team',
                        category: 'Some other category',
                        icon: 'cog',
                        order: 1,
                        default: false,
                        externalUrl: 'https://google.com'
                    }
                ]
            }).as('getBlueprints')
            cy.intercept('POST', '/api/*/applications').as('createApplication')

            cy.visit(`/team/${team.slug}/projects/create`)

            cy.wait('@getBlueprints')

            cy.get('[data-form="application-name"] input').clear()
            cy.get('[data-form="application-name"] input').type(`new-application-${Math.random().toString(36).substring(2, 7)}`)

            cy.get('[data-el="next-step"]').click()

            cy.get('[data-el="instance-name-error"]').should('not.exist')

            cy.get('[data-el="instance-name"] input').clear()
            cy.get('[data-el="instance-name"] input').type('instance-1-1')

            cy.get('[data-el="instance-name-error"]').should('exist')
            cy.get('[data-el="next-step"]').should('be.disabled')

            // add a diff in the name
            cy.get('[data-el="instance-name"] input').type(`-${Math.random().toString(36).substring(2, 7)}`)

            cy.get('[data-el="next-step"]').should('be.disabled')

            // select remainder mandatory options
            cy.get('[data-form="project-type"]').contains('type1').click()
            cy.get('[data-form="project-template"]').contains('template1').click()

            cy.get('[data-el="node-red-listbox"]').click()
            cy.get('[data-option].ff-option').first().click()

            cy.get('[data-el="next-step"]').should('not.be.disabled')

            cy.get('[data-el="next-step"]').click()

            cy.get('[data-step="blueprint"]').should('exist')

            cy.get('[data-el="next-step"]').click()

            // check that we've been redirected to the application instances page
            cy.get('[data-el="cloud-instances"]').should('exist')
        })
    })

    it('can be updated', () => {
        const START_ID = Math.random().toString(36).substring(2, 7)
        const START_APPLICATION_NAME = `new-application-${START_ID}`
        const START_APPLICATION_DESCRIPTION = `new-description-${START_ID}`
        const UPDATED_ID = Math.random().toString(36).substring(2, 7)
        const UPDATED_APPLICATION_NAME = `updated-application-${UPDATED_ID}`
        const UPDATED_APPLICATION_DESCRIPTION = `updated-description-${UPDATED_ID}`

        let team
        cy.request('GET', 'api/v1/teams')
            .then((response) => {
                team = response.body.teams[0]
                return cy.request('POST', '/api/v1/applications', {
                    name: START_APPLICATION_NAME,
                    description: START_APPLICATION_DESCRIPTION,
                    teamId: team.id
                })
            })
            .then((response) => {
                cy.intercept('GET', '/api/*/applications/*').as('getApplication')

                cy.visit('/')

                cy.get('[data-nav="team-projects"]').click()

                cy.wait('@getTeamApplications')

                cy.contains(START_APPLICATION_NAME).click()

                cy.wait('@getApplication')

                cy.get('[data-nav="application-settings"]').click()

                cy.get('[data-el="application-settings"]').within(() => {
                    cy.get('[data-action="application-edit"]').click()

                    cy.get('[data-form="application-name"] input[type="text"]').clear()
                    cy.get('[data-form="application-name"] input[type="text"]').type(UPDATED_APPLICATION_NAME)
                    cy.get('[data-form="application-description"] input[type="text"]').clear()
                    cy.get('[data-form="application-description"] input[type="text"]').type(UPDATED_APPLICATION_DESCRIPTION)

                    cy.get('[data-form="submit"]').click()
                })

                // Name updated on application page
                cy.get('[data-el="page-name"]').contains(UPDATED_APPLICATION_NAME)

                cy.get('[data-nav="team-projects"]').click()

                // Name updated on team page
                cy.wait('@getTeamApplications')

                cy.contains(UPDATED_APPLICATION_NAME).should('exist')
                cy.contains(START_APPLICATION_NAME).should('not.exist')
                cy.contains(START_APPLICATION_DESCRIPTION).should('not.exist')

                // now navigate to the Applications view and check the UPDATED description is present alongside the application name
                cy.visit(`/team/${team.slug}/projects`)
                // div.ff-application-list--app should have the app name and description
                cy.get('[data-action="view-application"]').contains(UPDATED_APPLICATION_NAME)
                cy.get('[data-action="view-application"]').contains(UPDATED_APPLICATION_DESCRIPTION)
            })
    })

    it('can be deleted', () => {
        const APPLICATION_NAME = `new-application-${Math.random().toString(36).substring(2, 7)}`

        cy.intercept('DELETE', '/api/*/applications/*').as('deleteProject')

        let team
        cy.request('GET', 'api/v1/teams')
            .then((response) => {
                team = response.body.teams[0]
                return cy.request('POST', '/api/v1/applications', {
                    name: APPLICATION_NAME,
                    teamId: team.id
                })
            })
            .then((response) => {
                cy.intercept('GET', '/api/*/applications/*').as('getApplication')

                const application = response.body
                cy.visit(`/team/${team.slug}/projects/${application.id}/settings`)
                cy.wait('@getApplication')

                cy.get('[data-el="delete-application-dialog"]').should('not.be.visible')
                cy.get('[data-action="delete-application"]').click()

                cy.get('[data-el="delete-application-dialog"]')
                    .should('be.visible')
                    .within(() => {
                        // Dialog is open
                        cy.get('.ff-dialog-header').contains('Delete Application')

                        // Main button should be disabled
                        cy.get('button.ff-btn.ff-btn--danger').should('be.disabled')
                        cy.get('[data-form="application-name"] input[type="text"]').type(APPLICATION_NAME)

                        // Should now be enabled again
                        cy.get('button.ff-btn.ff-btn--danger').click()
                    })

                cy.wait('@deleteProject')

                cy.url().should('include', `/team/${team.slug}/projects`)
            })
    })

    it('check if application has instances, then delete application button should be disabled, and if application has no instances, the button should be enabled', () => {
        let team
        let applications
        cy.request('GET', 'api/v1/teams')
            .then((res) => res.body.teams)
            .then((res) => {
                team = res.find(team => team.slug === 'ateam')
            })
            .then(() => cy.request('GET', `/api/v1/teams/${team.id}/applications`))
            .then((res) => res.body.applications)
            .then((res) => {
                applications = res
            })
            .then(() => {
                // find an application with instances
                const application = applications.find(app => app.instances.length > 1)
                cy.visit(`/team/${team.slug}/projects/${application.id}/settings`)

                // check that the delete application button is disabled
                cy.get('[data-action="delete-application"]').should('be.disabled')
            })
            .then(() => {
                // find an application with instances
                const application = applications.find(app => app.instances.length === 0)
                cy.visit(`/team/${team.slug}/projects/${application.id}/settings`)

                // check that the delete application button is not disabled
                cy.get('[data-action="delete-application"]').should('not.be.disabled')
            })
    })

    it('should display the back button when creating an instance from the application page', () => {
        cy.visit('/')
        cy.get('[data-nav="team-projects"]').click()
        cy.get('[data-action="view-application"]').first().click()

        cy.get('[data-action="create-instance"]').should('exist')
        cy.get('[data-action="create-instance"]').should('not.be.disabled')
        cy.get('[data-action="create-instance"]').click()

        cy.get('[data-nav="back"]').should('exist')
        cy.get('[data-nav="back"]').contains('Back')
        cy.get('[data-nav="back"]').click()

        cy.url().should('match', /^.*\/team\/.*\/projects\/.*\/instances/)
    })
})

describe('FlowForge stores audit logs for an application', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/team/ateam/audit-log')
    })

    it('when it is created', () => {
        cy.get('.ff-audit-entry').contains('Application Created')
    })

    it('when it is updated', () => {
        cy.get('.ff-audit-entry').contains('Application Modified')
    })

    it('when it is deleted', () => {
        cy.get('.ff-audit-entry').contains('Application Deleted')
    })
})
