describe('FlowForge - Instances', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    describe('Create without application', () => {
        it('only displays flow blueprints if they are available', () => {
            cy.intercept('GET', '/api/*/flow-blueprints?filter=active').as('loadBlueprints')

            let blueprint1, blueprint2
            cy.request('GET', 'api/v1/teams').then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/instances/create`)

                cy.wait('@loadBlueprints')

                cy.get('[data-form="flow-blueprint"]').should('not.exist')

                return cy.request('POST', '/api/v1/flow-blueprints', {
                    name: 'New Blueprint',
                    active: true,
                    category: 'category-1',
                    description: 'The description',
                    flows: { flows: [] },
                    modules: { module1: '0.0.1' }
                })
            }).then((response) => {
                blueprint1 = response.body
                return cy.request('POST', '/api/v1/flow-blueprints', {
                    name: 'New Blueprint 2',
                    active: true,
                    category: 'category-1',
                    description: 'The description 2',
                    flows: { flows: [] },
                    modules: { module1: '0.0.1' }
                })
            }).then((response) => {
                blueprint2 = response.body

                cy.reload()

                cy.wait('@loadBlueprints')

                cy.get('[data-form="flow-blueprint"]').should('exist').within(() => {
                    cy.get('[data-form="tile-selection-option-label"]').should('have.length', 3) // blank + 2 created

                    cy.get('[data-form="flow-blueprint-blank"]').should('exist')

                    cy.get('[data-form="tile-selection-option-label"]').contains('New Blueprint')
                    cy.get('[data-form="tile-selection-option-description"]').contains('The description')

                    cy.get('[data-form="tile-selection-option-label"]').contains('New Blueprint 2')
                    cy.get('[data-form="tile-selection-option-description"]').contains('The description 2')
                })

                return cy.request(
                    'DELETE',
                    `/api/v1/flow-blueprints/${blueprint1.id}`
                )
            }).then(() => {
                cy.request(
                    'DELETE',
                    `/api/v1/flow-blueprints/${blueprint2.id}`
                )
            })
        })

        it('can use an existing flow blueprint', () => {
            cy.intercept('POST', '/api/*/applications').as('createApplication')
            cy.intercept('POST', '/api/*/projects').as('createInstance')
            cy.intercept('GET', '/api/*/flow-blueprints?filter=active').as('loadBlueprints')

            cy.login('alice', 'aaPassword')
            cy.home()

            let blueprint1, instanceId
            cy.request('POST', '/api/v1/flow-blueprints', {
                name: 'New Blueprint',
                active: true,
                category: 'category-1',
                description: 'The description',
                flows: { flows: [{ name: 'flow1', x: 0, y: 0 }] },
                modules: { module1: '0.0.1' }
            }).then((response) => {
                blueprint1 = response.body

                return cy.request('GET', 'api/v1/teams')
            }).then((response) => {
                const team = response.body.teams[0]

                cy.visit(`/team/${team.slug}/instances/create`)

                cy.wait('@loadBlueprints')

                cy.get('[data-form="application-id"]').click()
                cy.get('[data-form="application-id"] .ff-dropdown-options').should('be.visible')
                cy.get('[data-form="application-id"] .ff-dropdown-options > .ff-dropdown-option:first').click()

                cy.get('[data-form="project-type"]').contains('type1').click()

                cy.get('[data-form="tile-selection-option-label"]').contains('New Blueprint').click()

                cy.get('[data-action="create-project"]').should('not.be.disabled').click()

                cy.wait('@createInstance')

                cy.url().should('match', /\/instance\/.*\/overview/)

                return cy.url()
            }).then((url) => {
                instanceId = url.split('/').splice(-2, 1)

                return cy.request('POST', `/api/v1/projects/${instanceId}/snapshots`, {})
            }).then((response) => {
                const snapshotId = response.body.id

                return cy.request('POST', `/api/v1/projects/${instanceId}/snapshots/${snapshotId}/export`, { credentialSecret: 'secret' })
            }).then((response) => {
                const instanceDetails = response.body

                expect(instanceDetails.flows.flows).to.deep.equal([{ name: 'flow1', x: 0, y: 0 }])
                expect(instanceDetails.settings.settings.palette.modules).to.deep.equal({ module1: '~0.0.1' })

                return cy.request(
                    'DELETE',
                    `/api/v1/flow-blueprints/${blueprint1.id}`
                )
            })
        })
    })
})
