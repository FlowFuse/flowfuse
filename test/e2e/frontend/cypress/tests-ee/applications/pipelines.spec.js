describe('FlowForge - Application - DevOps Pipelines', () => {
    let application
    function navigateToApplication (teamName, projectName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                application = response.body.applications.find(
                    (app) => app.name === projectName
                )
                cy.visit(`/application/${application.id}/instances`)
                cy.wait('@getApplication')
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.login('bob', 'bbPassword')
        cy.home()
        navigateToApplication('BTeam', 'application-2')
        cy.get('[data-nav="application-pipelines"]').should('exist')
    })

    it('can navigate to the /pipelines page with EE license', () => {
        cy.visit(`/application/${application.id}/pipelines`)
        cy.url().should('include', `/application/${application.id}/pipelines`)
    })

    it('can create pipelines containing stages', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        cy.visit(`/application/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-form"]').should('be.visible')

        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        cy.get('[data-el="pipelines-list"]').should('contain', PIPELINE_NAME)

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        cy.get('[data-form="stage-instance"]').click()
        cy.get('[data-form="stage-instance"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-dropdown-options > .ff-dropdown-option:first').click()

        cy.get('[data-action="add-stage"]').click()

        // Add stage 2
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 2')

        cy.get('[data-form="stage-instance"]').click()
        cy.get('[data-form="stage-instance"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-dropdown-options > .ff-dropdown-option:first').click()

        cy.get('[data-action="add-stage"]').click()

        // Tidy Up
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('Stage 1')
            cy.contains('Stage 2')

            cy.get('[data-action="delete-pipeline"]').click()
        })

        cy.get('[data-el="platform-dialog"]')
            .should('be.visible')
            .within(() => {
                /* eslint-disable cypress/require-data-selectors */
                cy.get('.ff-dialog-header').contains('Delete Pipeline')
                cy.get('button.ff-btn.ff-btn--danger').click()
                /* eslint-enable */
            })
    })

    it('can edit the instance assigned to a stage', () => {
        cy.intercept('GET', '/api/v1/applications/*/pipelines').as('getPipelines')
        cy.intercept('POST', '/api/v1/pipelines').as('createPipeline')

        cy.visit(`/application/${application.id}/pipelines`)
        cy.wait('@getPipelines')

        const PIPELINE_NAME = `My New Pipeline - ${Math.random().toString(36).substring(2, 7)}`

        // Add pipeline
        cy.get('[data-action="pipeline-add"]').click()
        cy.get('[data-form="pipeline-name"] input').type(PIPELINE_NAME)
        cy.get('[data-action="create-pipeline"]').click()

        cy.wait('@createPipeline')

        // Add stage 1
        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.get('[data-action="add-stage"]').click()
        })

        cy.get('[data-form="stage-name"] input[type="text"]').type('Stage 1')

        cy.get('[data-form="stage-instance"]').click()
        cy.get('[data-form="stage-instance"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-dropdown-options > .ff-dropdown-option:first').click()

        cy.get('[data-action="add-stage"]').click()

        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('instance-2-1')
            cy.get('[data-action="stage-edit"]').click()
        })

        // Stage Edit Form
        cy.get('[data-form="stage-name"] input').should(($input) => {
            const stageName = $input.val()
            expect(stageName).to.equal('Stage 1')
        })

        cy.get('[data-form="stage-instance"] .ff-dropdown-selected').should('contain', 'instance-2-1')

        cy.get('[data-form="stage-instance"]').click()
        cy.get('[data-form="stage-instance"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-form="stage-instance"] .ff-dropdown-options > .ff-dropdown-option:last').click()

        cy.get('[data-form="stage-instance"] .ff-dropdown-selected').should('contain', 'instance-2-with-devices')

        cy.get('[data-action="add-stage"]').click()

        cy.get(`[data-el="pipelines-list"] [data-el="pipeline-row"]:contains("${PIPELINE_NAME}")`).within(() => {
            cy.contains('instance-2-with-devices')
        })
    })
})
