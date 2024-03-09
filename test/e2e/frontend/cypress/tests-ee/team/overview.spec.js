describe('FlowForge - Team Overview (Home) - With License', () => {
    function navigateToTeam (teamName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )

                return cy.visit(`/team/${team.slug}/applications`)
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('shows a list of cloud hosted instances', () => {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === 'BTeam'
                )

                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((applicationResponse) => {
                const applications = applicationResponse.body.applications

                const instanceOneId = applications[0].instances.find((instance) => instance.name === 'instance-2-1').id
                const instanceTwoId = applications[0].instances.find((instance) => instance.name === 'instance-2-with-devices').id

                const deviceOneId = applications[0].devices.find((device) => device.name === 'application-device-a').id
                const deviceTwoId = applications[0].devices.find((device) => device.name === 'application-device-b').id

                cy.intercept('GET', '/api/*/teams/*/applications/status*', (req) => {
                    req.continue((res) => {
                        const instanceOne = res.body.applications[0].instances.find((instance) => instance.id === instanceOneId)
                        instanceOne.meta.state = 'running'
                        instanceOne.flowLastUpdatedAt = new Date().toISOString()

                        const instanceTwo = res.body.applications[0].instances.find((instance) => instance.id === instanceTwoId)
                        instanceTwo.meta.state = 'stopped'

                        const deviceOne = res.body.applications[0].devices.find((device) => device.id === deviceOneId)

                        deviceOne.status = 'running'
                        deviceOne.editor = {
                            url: 'http://editor.example.com',
                            enabled: true,
                            connected: true,
                            local: true
                        }

                        const deviceTwo = res.body.applications[0].devices.find((device) => device.id === deviceTwoId)
                        deviceTwo.status = 'stopped'
                    })
                }).as('getApplicationsStatus')

                cy.intercept('GET', '/api/*/teams/*/applications*', (req) => {
                    req.continue((res) => {
                        const instanceOne = res.body.applications[0].instancesSummary.instances.find((instance) => instance.id === instanceOneId)
                        instanceOne.flowLastUpdatedAt = new Date().toISOString()

                        const instanceTwo = res.body.applications[0].instancesSummary.instances.find((instance) => instance.id === instanceTwoId)
                        instanceTwo.mostRecentAuditLogCreatedAt = new Date().toISOString()
                        instanceTwo.mostRecentAuditLogEvent = 'project.stopped'

                        const deviceOne = res.body.applications[0].devicesSummary.devices.find((device) => device.id === deviceOneId)

                        deviceOne.lastSeenAt = new Date().toISOString()
                        deviceOne.status = 'running'
                        deviceOne.mostRecentAuditLogCreatedAt = new Date().toISOString()
                        deviceOne.mostRecentAuditLogEvent = 'application.device.assigned'

                        const deviceTwo = res.body.applications[0].devicesSummary.devices.find((device) => device.id === deviceTwoId)
                        deviceTwo.status = 'stopped'
                    })
                }).as('getApplications')

                navigateToTeam('BTeam')

                cy.wait('@getApplications')
                cy.wait('@getApplicationsStatus')

                cy.get('[data-el="applications-list"]').find('> li').should('have.length', 1)

                cy.get('[data-el="applications-list"] > li').first().within(() => {
                    cy.contains('application-2')

                    cy.get('[data-el="application-summary"]').should(($div) => {
                        const labels = $div.find('a span').map(function () { return this.innerText })

                        const text = labels.toArray().join(', ')

                        // Test should pass for single test of full suite (objects persist between tests)
                        expect(text).to.match(/2 x Instances, 2 x Devices, 2 x Device Groups, 8 x Snapshots, 4 x Pipelines|2 x Instances, 2 x Devices, 1 x Device Group, 3 x Snapshots/)
                    })

                    cy.get('[data-el="application-instances"]').find('li').should('have.length', 2)
                    cy.get('[data-el="application-instances"] li:contains("instance-2-with-devices")').within(() => {
                        cy.contains('stopped')
                        cy.contains('Instance Stopped')
                        cy.contains('moments ago')

                        cy.get('[data-action="open-editor"]').should('be.disabled')
                    })

                    cy.get('[data-el="application-instances"] li:contains("instance-2-1")').within(() => {
                        cy.contains('instance-2-1')
                        cy.contains('running')
                        cy.contains('http://instance-2-1.example.com')
                        cy.contains('Flows last deployed')

                        cy.get('[data-action="open-editor"]').should('be.enabled')
                    })

                    cy.get('[data-el="application-devices"]').find('li').should('have.length', 2)
                    cy.get('[data-el="application-devices"] li:contains("application-device-a")').within(() => {
                        cy.contains('running')
                        cy.contains('Device Assigned to Application')
                        cy.contains('moments ago')
                        cy.contains('http://editor.example.com')
                        cy.get('[data-action="open-editor"]').should('be.enabled')
                    })

                    cy.get('[data-el="application-devices"] li:contains("application-device-b")').within(() => {
                        cy.contains('stopped')

                        cy.contains('Device last seen')
                        cy.contains('never')

                        cy.get('[data-action="open-editor"]').should('be.disabled')
                    })
                })
            })
    })
})
