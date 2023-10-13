describe('FlowForge - Application', () => {
    let application

    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.loadApplication('ATeam', 'application-1').then((response) => {
            application = response
        })
    })

    describe('Creating an instance within an application', () => {
        it('only displays flow blueprints if they are available', () => {
            cy.intercept('GET', '/api/*/flow-blueprints?filter=active').as('loadBlueprints')

            cy.visit(`/application/${application.id}/instances/create`)
            cy.wait('@loadBlueprints')
            cy.get('[data-form="flow-blueprint"]').should('not.exist')

            let blueprint1, blueprint2
            cy.request('POST', '/api/v1/flow-blueprints', {
                name: 'New Blueprint',
                active: true,
                category: 'category-1',
                description: 'The description',
                flows: { flows: [] },
                modules: { module1: '0.0.1' }
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
            cy.intercept('POST', '/api/*/projects').as('createInstance')
            cy.intercept('GET', '/api/*/flow-blueprints?filter=active').as('loadBlueprints')

            cy.login('alice', 'aaPassword')
            cy.home()

            let blueprint1, instance
            cy.request('POST', '/api/v1/flow-blueprints', {
                name: 'New Blueprint',
                active: true,
                category: 'category-1',
                description: 'The description',
                flows: { flows: [{ name: 'flow1', x: 0, y: 0 }] },
                modules: { module1: '0.0.1' }
            }).then((response) => {
                blueprint1 = response.body

                cy.visit(`/application/${application.id}/instances/create`)
                cy.wait('@loadBlueprints')

                cy.get('[data-form="project-type"]').contains('type1').click()

                cy.get('[data-form="tile-selection-option-label"]').contains('New Blueprint').click()

                cy.get('[data-action="create-project"]').should('not.be.disabled').click()

                return cy.wait('@createInstance')
            }).then((interception) => {
                instance = interception.response.body

                cy.url().should('match', /\/application\/.*\/instances/)
            }).then((url) => {
                return cy.request('POST', `/api/v1/projects/${instance.id}/snapshots`, {})
            }).then((response) => {
                const snapshotId = response.body.id

                return cy.request('POST', `/api/v1/projects/${instance.id}/snapshots/${snapshotId}/export`, { credentialSecret: 'secret' })
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
