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
        cy.intercept('GET', '/api/*/teams/*/applications/status*', (req) => {
            req.continue((res) => {
                res.body.applications[0].instances[0].meta.state = 'stopped'

                res.body.applications[0].instances[1].flowLastUpdatedAt = new Date().toISOString()

                res.body.applications[0].devices[0].status = 'running'
                res.body.applications[0].devices[0].editor = {
                    url: 'http://editor.example.com',
                    enabled: true,
                    connected: true
                }
            })
        })

        cy.intercept('GET', '/api/*/teams/*/applications*', (req) => {
            req.continue((res) => {
                res.body.applications[0].instancesSummary.instances[0].mostRecentAuditLogCreatedAt = new Date().toISOString()
                res.body.applications[0].instancesSummary.instances[0].mostRecentAuditLogEvent = 'project.stopped'

                res.body.applications[0].instancesSummary.instances[1].flowLastUpdatedAt = new Date().toISOString()

                res.body.applications[0].devicesSummary.devices[0].lastSeenAt = new Date().toISOString()
                res.body.applications[0].devicesSummary.devices[0].status = 'running'
                res.body.applications[0].devicesSummary.devices[0].mostRecentAuditLogCreatedAt = new Date().toISOString()
                res.body.applications[0].devicesSummary.devices[0].mostRecentAuditLogEvent = 'application.device.assigned'
            })
        })

        navigateToTeam('BTeam')

        cy.get('[data-el="applications-list"]').find('> li').should('have.length', 1)

        cy.get('[data-el="applications-list"] > li').first().within(() => {
            cy.contains('application-2')
            cy.get('[data-el="application-summary"]').should('have.text', '2 Instances, 2 Devices, 1 Device Group, 3 Snapshots')

            cy.get('[data-el="application-instances"]').find('li').should('have.length', 2)
            cy.get('[data-el="application-instances"]').first().within(() => {
                cy.contains('instance-2-with-devices')
                cy.contains('stopped')
                cy.contains('Instance Stopped')
                cy.contains('moments ago')

                cy.get('[data-action="open-editor"]').should('be.disabled')
            })

            cy.get('[data-el="application-instances"]').last().within(() => {
                cy.contains('instance-2-1')
                cy.contains('running')
                cy.contains('http://instance-2-1.example.com')
                cy.contains('Flows last deployed')
                cy.get('[data-action="open-editor"]').should('be.enabled')
            })

            cy.get('[data-el="application-devices"]').find('li').should('have.length', 2)
            cy.get('[data-el="application-devices"]').first().within(() => {
                cy.contains('application-device-b')
                cy.contains('running')
                cy.contains('Device Assigned to Application')
                cy.contains('moments ago')
                cy.contains('http://editor.example.com')
                cy.get('[data-action="open-editor"]').should('be.enabled')
            })

            cy.get('[data-el="application-devices"]').first().within(() => {
                cy.contains('application-device-a')

                cy.contains('offline')

                cy.contains('Device last seen')
                cy.contains('never')

                cy.get('[data-action="open-editor"]').should('be.disabled')
            })
        })
    })
})
