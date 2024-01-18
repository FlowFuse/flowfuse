describe('FlowForge - Table Component', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    describe('Kebab Menu', () => {
        it('opens within viewport', () => {
            const devices = []
            for (let i = 0; i < 20; i++) {
                devices.push({
                    id: 'p2dOYBDb' + i.toString().padStart(2, '0'),
                    ownerType: 'application',
                    name: 'Device ' + (i + 1),
                    type: '',
                    createdAt: '2024-01-15T18:53:43.736Z',
                    updatedAt: '2024-01-18T13:32:45.375Z',
                    lastSeenAt: new Date().toISOString(),
                    lastSeenMs: 5 + i,
                    activeSnapshot: {
                        id: 'Qb9OMPPj' + i.toString().padStart(2, '0'),
                        name: 'V1.1',
                        description: ''
                    },
                    targetSnapshot: {
                        id: 'Qb9OMPPj' + i.toString().padStart(2, '0'),
                        name: 'V1.1',
                        description: ''
                    },
                    status: 'running',
                    isDeploying: false,
                    agentVersion: '1.15.0',
                    mode: 'developer',
                    links: { self: 'http://' },
                    team: {
                        id: 'ateam',
                        name: 'ateam',
                        slug: 'ateam',
                        links: { self: 'http://' }
                    },
                    application: {
                        id: 'QJRYOX1ej8',
                        name: 'App 1',
                        links: { self: 'http://' }
                    },
                    editor: {
                        enabled: false
                    }
                })
            }
            cy.intercept('/api/*/teams/*/devices*', {
                body: {
                    meta: {},
                    count: devices.length,
                    devices
                }
            }).as('getDevices')

            cy.visit('team/ateam/devices')
            cy.wait(['@getDevices'])
            // scroll to the bottom of the page
            // eslint-disable-next-line cypress/require-data-selectors
            cy.get('div.ff-view').scrollTo('bottom')
            // ensure the last row is visible
            cy.get('[data-el="devices-browser"] tbody tr:last-child').should('be.visible')
            // click the kebab menu on the last device
            cy.get('[data-el="devices-browser"] tbody tr:last-child').find('.ff-kebab-menu').eq(0).click()
            // ensure the kebab menu is opened
            cy.get('[data-el="devices-browser"] tbody tr:last-child td:last-child').find('ul.ff-kebab-options').should('be.visible')
            // ensure the last entry of kebab menu is visible and fully on screen
            cy.get('[data-el="devices-browser"] tbody tr:last-child td:last-child').find('ul.ff-kebab-options li:last-child').isInViewport()
        })
    })
})
