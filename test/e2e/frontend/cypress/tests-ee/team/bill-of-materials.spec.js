import dependencies from '../../fixtures/bill-of-materials/team-dependencies.json'
const interceptBom = (dependencies = []) => {
    cy.intercept('GET', '/api/*/teams/*/bom', [...dependencies]).as('getBom')
}

describe('Team - Bill Of Materials', () => {
    describe('Bill of Materials disabled teams', () => {
        it('should have access to the team bill of materials menu entry and page', () => {
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-bom"]').should('exist')
            cy.get('[data-nav="team-bom"] [data-el="premium-feature"]').should('exist')

            cy.get('[data-nav="team-bom"]').click()

            cy.url().should('include', 'bill-of-materials')

            cy.get('[data-el="page-name"]').contains('Bill Of Materials')

            cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('exist')

            cy.contains('Bill Of Materials not available!')
        })
    })

    describe('Bill of Materials enabled teams', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*', req => req.reply(res => {
                res.send({
                    ...res.body,
                    type: {
                        ...res.body.type,
                        properties: {
                            ...res.body.type.properties,
                            features: {
                                ...res.body.type.properties.features,
                                bom: true
                            }
                        }
                    }
                })
            }))
            cy.intercept('GET', 'https://registry.npmjs.com/**', {
                statusCode: 200,
                body: {
                    'dist-tags': {
                        latest: 'x.x.x'
                    },
                    time: {
                        modified: new Date()
                    },
                    versions: {
                        'x.x.x': {
                            version: 'N/A'
                        }
                    }
                }
            }).as('getExternalDependency')
        })

        it('should display the bom menu entry, not redirect for team owners', () => {
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-bom"]').should('exist')
            cy.get('[data-nav="team-bom"] [data-el="premium-feature"]').should('not.exist')

            cy.get('[data-nav="team-bom"]').click()

            cy.url().should('include', 'bill-of-materials')

            cy.get('[data-el="page-name"]').contains('Bill Of Materials')

            cy.get('[data-el="page-banner-feature-unavailable-to-team"]').should('not.exist')

            cy.contains('No Dependencies Here... Yet!')
        })

        it('should redirect member users away and not display the menu entry for the bom page', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 30 })

            cy.login('alice', 'aaPassword')
            cy.home()

            // navigate away from applications page to verify redirect
            cy.get('[data-nav="team-instances"]').click()

            cy.get('[data-nav="team-bom"]').should('not.exist')

            cy.visit('/team/ateam/bill-of-materials')

            cy.url().should('include', 'applications')
        })

        it('should redirect viewer users away and not display the menu entry for the bom page', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 10 })

            cy.login('alice', 'aaPassword')
            cy.home()

            // navigate away from applications page to verify redirect
            cy.get('[data-nav="team-instances"]').click()

            cy.get('[data-nav="team-bom"]').should('not.exist')

            cy.visit('/team/ateam/bill-of-materials')

            cy.url().should('include', 'applications')
        })

        it('should redirect dashboard users away and not display the menu entry for the bom page', () => {
            cy.intercept('GET', '/api/*/teams/*/user', { role: 5 })

            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-bom"]').should('not.exist')
        })

        it('should have access to the dependencies tab and can search by name', () => {
            interceptBom(dependencies)

            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-bom"]').click()

            cy.wait('@getExternalDependency')

            cy.get('[data-el="dependency-item"]').should('have.length', 5)

            // can search by instance name
            cy.get('[data-form="search"] input').type('instance-x')
            cy.get('[data-el="dependency-item"]').should('have.length', 0)
            cy.contains('Oops! We couldn\'t find any matching results.')

            cy.get('[data-form="search"] input').clear()
            cy.get('[data-form="search"] input').type('instance-1')
            cy.get('[data-el="dependency-item"]').should('have.length', 3)

            cy.get('[data-el="dependency-item"]').contains('@package/dep-1').click()
            cy.get('[data-el="dependency-item"]').contains('@package/dep-1')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="versions-list"] button').click()
                    cy.get('[data-el="versions-list"] button').contains('1 x Hosted Instances')
                    cy.get('[data-el="versions-list"]')
                        .within(() => {
                            cy.get('[data-el="instance-item"]').should('have.length', 1)
                            cy.contains('instance-1')
                            cy.contains('My First App')
                        })
                })

            cy.get('[data-el="dependency-item"]').contains('@package/var-2').click()
            cy.get('[data-el="dependency-item"]').contains('@package/var-2').parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="versions-list"] button').click()
                    cy.get('[data-el="versions-list"] button').contains('1 x Hosted Instances')
                    cy.get('[data-el="versions-list"]')
                        .within(() => {
                            cy.get('[data-el="instance-item"]').should('have.length', 1)
                            cy.contains('instance-1')
                            cy.contains('My First App')
                        })
                })

            cy.get('[data-el="dependency-item"]').contains('@external/sem-3').click()
            cy.get('[data-el="dependency-item"]').contains('@external/sem-3')
                .parent()
                .parent()
                .parent()
                .within(() => {
                    cy.get('[data-el="versions-list"] button').click()
                    cy.get('[data-el="versions-list"] button').contains('1 x Hosted Instances')
                    cy.get('[data-el="versions-list"]')
                        .within(() => {
                            cy.get('[data-el="instance-item"]').should('have.length', 1)
                            cy.contains('instance-1')
                            cy.contains('My First App')
                        })
                })
        })

        it('should have access to the dependencies tab and can search by instance type', () => {
            interceptBom(dependencies)

            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-bom"]').click()
            cy.wait('@getExternalDependency')

            cy.get('[data-el="dependency-item"]').should('have.length', 5)

            // can search by instance type
            cy.get('[data-form="search"] input').type('instance')
            cy.get('[data-el="dependency-item"]').should('have.length', 5)

            cy.contains('x Remote Instances').should('not.exist')

            // can search by instance type
            cy.get('[data-form="search"] input').clear()
            cy.get('[data-form="search"] input').type('device')
            cy.get('[data-el="dependency-item"]').should('have.length', 3)

            cy.contains('x Instances').should('not.exist')
        })

        it('should have access to the dependencies tab and can search by package name', () => {
            interceptBom(dependencies)

            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-bom"]').click()
            cy.wait('@getExternalDependency')

            cy.get('[data-el="dependency-item"]').should('have.length', 5)

            // can search by package name
            cy.get('[data-form="search"] input').type('@lonely/package-1')
            cy.get('[data-el="dependency-item"]').should('have.length', 1)

            cy.get('[data-form="search"] input').clear()
            cy.get('[data-form="search"] input').type('var')
            cy.get('[data-el="dependency-item"]').should('have.length', 2)
        })

        it('should have access to the dependencies tab and can search by package version', () => {
            interceptBom(dependencies)

            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-bom"]').click()
            cy.wait('@getExternalDependency')

            cy.get('[data-el="dependency-item"]').should('have.length', 5)

            // can search by package version
            cy.get('[data-form="search"] input').type('4.4.4')
            cy.get('[data-el="dependency-item"]').should('have.length', 1)

            cy.get('[data-form="search"] input').clear()
            cy.get('[data-form="search"] input').type('1.1.1')
            cy.get('[data-el="dependency-item"]').should('have.length', 2)
        })

        it('should correctly display the status pill for remote instances and hosted instances', () => {
            interceptBom(dependencies)

            cy.login('alice', 'aaPassword')
            cy.home()

            cy.get('[data-nav="team-bom"]').click()
            cy.wait('@getExternalDependency')

            // cy.get('[data-el="dependency-item"][data-item="@package/dep-1"] .dependency-header').click()

            // check that we have an instance running status
            cy.get('[data-el="dependency-item"][data-item="@package/dep-1"] .dependency-header').click()
            cy.get('[data-el="dependency-item"][data-item="@package/dep-1"] [data-el="versions-list"][data-item="1.1.1"]').click()
            cy.get('[data-el="dependency-item"][data-item="@package/dep-1"] [data-item="1.1.1"] [data-el="status-badge-running"]').should('exist')
            cy.get('[data-el="dependency-item"][data-item="@package/dep-1"] [data-item="1.1.1"] [data-el="status-badge-running"]').contains('running')

            // check that we have an instance suspended status
            cy.get('[data-el="dependency-item"][data-item="@package/dep-1"] [data-el="versions-list"][data-item="5.5.5"]').click()
            cy.get('[data-el="dependency-item"][data-item="@package/dep-1"] [data-item="5.5.5"] [data-el="status-badge-suspended"]').should('exist')
            cy.get('[data-el="dependency-item"][data-item="@package/dep-1"] [data-item="5.5.5"] [data-el="status-badge-suspended"]').contains('suspended')

            // check that we don't have an instance status pill of we don't receive it in the payload
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] .dependency-header').click()
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] [data-el="versions-list"][data-item="1.1.1"]').click()
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] [data-item="instance-4"] [data-el="status-badge-suspended"]').should('not.exist')
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] [data-item="instance-4"] [data-el="status-badge-running"]').should('not.exist')

            // check that we have a device running status
            cy.get('[data-el="dependency-item"][data-item="@package/var-2"] .dependency-header').click()
            cy.get('[data-el="dependency-item"][data-item="@package/var-2"] [data-el="versions-list"][data-item="7.7.7"]').click()
            cy.get('[data-el="dependency-item"][data-item="@package/var-2"] [data-item="device-1"] [data-el="status-badge-running"]').should('exist')
            cy.get('[data-el="dependency-item"][data-item="@package/var-2"] [data-item="device-1"] [data-el="status-badge-running"]').contains('running')

            // check that we have a device suspended status
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] [data-el="versions-list"][data-item="1.1.1"]').click()
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] [data-item="device-4"] [data-el="status-badge-suspended"]').should('exist')
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] [data-item="device-4"] [data-el="status-badge-suspended"]').contains('suspended')

            // check that we don't have a device status pill of we don't receive it in the payload
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] [data-el="versions-list"][data-item="1.1.1"]').click()
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] [data-item="device-3"] [data-el="status-badge-suspended"]').should('not.exist')
            cy.get('[data-el="dependency-item"][data-item="@some-package/var"] [data-item="device-3"] [data-el="status-badge-suspended"]').should('not.exist')
        })
    })
})
