describe('FlowForge - Instance editor', () => {
    function navigateToInstance (teamName, instanceName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const instance = response.body.projects.find(
                    (project) => project.name === instanceName
                )
                instance.name = 'qweqwe'
                cy.visit(`/instance/${instance.id}/`)
            })
    }

    it('Preserves the initial behavior if uses an unsupported launcher version', () => {
        cy.intercept(
            'GET',
            '/api/*/projects/*',
            (req) => req.reply(res => {
                res.body = { ...res.body, ...{ meta: { versions: { launcher: '2.3.0' } } } }
                return res
            })).as('getProjects')

        cy.login('bob', 'bbPassword')
        cy.home()

        navigateToInstance('ATeam', 'instance-1-1')

        cy.wait('@getProjects')

        cy.get('button[data-action="open-editor"]')
            .children()
            .should('exist')
    })

    it('Alters the open-editor button and opens the immersive editor when the launcher supports it', () => {
        cy.intercept(
            'GET',
            '/api/*/projects/*',
            (req) => req.reply(res => {
                res.body = { ...res.body, ...{ meta: { versions: { launcher: '2.3.1' } } } }
                return res
            })).as('getProjects')

        cy.login('bob', 'bbPassword')
        cy.home()

        navigateToInstance('ATeam', 'instance-1-1')

        cy.wait('@getProjects')

        cy.get('button[data-action="open-editor"]')
            .children()
            .should('not.exist')

        cy.get('button[data-action="open-editor"]').click()

        cy.get('iframe').should('exist')
        cy.get('.tabs-wrapper').should('exist')
    })

    it('has working drawer navigation tabs', () => {
        cy.intercept(
            'GET',
            '/api/*/projects/*',
            (req) => req.reply(res => {
                res.body = { ...res.body, ...{ meta: { versions: { launcher: '2.3.1' } } } }
                return res
            })).as('getProjects')

        cy.login('bob', 'bbPassword')
        cy.home()

        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === 'ATeam'
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/projects`)
            })
            .then((response) => {
                const instance = response.body.projects.find(
                    (project) => project.name === 'instance-1-1'
                )
                instance.name = 'qweqwe'
                cy.visit(`/instance/${instance.id}/editor`)
            })

        cy.get('iframe')
            .should('exist')

        cy.get('.tabs-wrapper').as('tabs-wrapper').should('exist')
        cy.get('@tabs-wrapper').contains('Info')
        cy.get('@tabs-wrapper').contains('Recent Activity')
        cy.get('@tabs-wrapper').contains('Specs')

        cy.get('a[data-nav="instance-remote"]').as('remote-tab').should('exist')
        cy.get('@remote-tab').click()
        cy.get('@tabs-wrapper').contains('Devices')
        cy.get('@tabs-wrapper').contains('A list of all edge devices registered to this instance.')

        cy.get('a[data-nav="instance-snapshots"]').as('snapshots-tab').should('exist')
        cy.get('@snapshots-tab').click()
        cy.get('@tabs-wrapper').contains('Snapshots')
        cy.get('@tabs-wrapper').contains('Create your First Snapshot')

        cy.get('a[data-nav="instance-activity"]').as('activity-tab').should('exist')
        cy.get('@activity-tab').click()
        cy.get('@tabs-wrapper').contains('Audit Log')
        cy.get('@tabs-wrapper').contains('Filters')
        cy.get('@tabs-wrapper').contains('Event Type')
        cy.get('@tabs-wrapper').contains('User')

        cy.get('a[data-nav="instance-logs"]').as('logs-tab').should('exist')
        cy.get('@logs-tab').click()
        cy.get('@tabs-wrapper').contains('Node-RED Logs')
        cy.get('@tabs-wrapper').contains('Fake Log Entry')

        cy.get('a[data-nav="instance-settings"]').as('settings-tab').should('exist')
        cy.get('a[data-nav="instance-settings"]').click()
        cy.get('@tabs-wrapper').contains('Settings')
        cy.get('@tabs-wrapper').contains('General')
        cy.get('@tabs-wrapper').contains('Environment')
        cy.get('@tabs-wrapper').contains('Editor')
        cy.get('@tabs-wrapper').contains('Security')
        cy.get('@tabs-wrapper').contains('Palette')

        cy.get('a[data-nav="instance-overview"]').click()
        cy.get('@tabs-wrapper').contains('Info')
        cy.get('@tabs-wrapper').contains('Recent Activity')
        cy.get('@tabs-wrapper').contains('Specs')

        cy.get('@tabs-wrapper').get('.logo').click()
        cy.get('body').contains('Application')
    })
})
