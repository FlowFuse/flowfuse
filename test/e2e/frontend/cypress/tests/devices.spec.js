import deviceOffline from '../fixtures/device-offline.json'
import deviceRunning from '../fixtures/device-running.json'

describe('FlowFuse - Team Devices', () => {
    describe('team with no devices', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*/devices*').as('getDevices')
            cy.login('alice', 'aaPassword')
            cy.home()

            cy.request('GET', '/api/v1/teams/')
                .then((response) => {
                    const team = response.body.teams[0]
                    cy.visit(`/team/${team.slug}/devices`)
                    cy.wait('@getDevices')
                })
        })

        it('shows a placeholder message when no devices have been created', () => {
            cy.get('main').contains('Connect your First Remote Instance')
        })

        it('provides functionality to register a device', () => {
            cy.intercept('POST', '/api/*/devices').as('registerDevice')

            cy.get('button[data-action="register-device"]').click()

            cy.get('.ff-dialog-box').should('be.visible')
            cy.get('.ff-dialog-header').contains('Add Remote Instance')
            // disabled primary button by default
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').contains('Add')
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').should('be.disabled')

            cy.get('[data-form="device-name"] input[type="text"]').type('device1')
            // inserting device name is enough to enable button
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').should('not.be.disabled')
            cy.get('[data-form="device-type"] input[type="text"]').type('typeA')

            // click "Register"
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').contains('Add').click()

            cy.wait('@registerDevice')

            // show user the device config
            cy.get('.ff-dialog-box').should('be.visible')
            cy.get('.ff-dialog-header').contains('Device Agent Configuration')

            cy.get('[data-el="devices-browser"] tbody').find('tr').should('have.length', 1)
            cy.get('[data-el="devices-browser"] tbody').find('tr').contains('device1')
        })

        it('can delete a device', () => {
            cy.intercept('DELETE', '/api/*/devices/*').as('deleteDevice')

            // click kebab menu in row 1
            cy.get('[data-el="devices-browser"] tbody').find('.ff-kebab-menu').eq(0).click()
            // click the 4th option (Delete Device)
            cy.get('[data-el="kebab-options"].ff-kebab-options').find('.ff-kebab-item')
                .contains('Delete Device')
                .parent()
                .click()

            cy.get('.ff-dialog-box').should('be.visible')
            cy.get('.ff-dialog-header').contains('Delete Device')

            // Click "Delete"
            cy.get('.ff-dialog-box button.ff-btn.ff-btn--danger').contains('Delete').parent().click()

            cy.wait('@deleteDevice')

            cy.get('main').contains('Connect your First Remote Instance')
        })

        it('renders numeric pagination and lets the user move between pages', function () {
            // statusOnly poll feeds the status bars AND the v-if that mounts the table —
            // empty `devices` keeps the table hidden, so seed it with the full set.
            const allDevices = Array.from({ length: 30 }, (_, i) => ({
                ...deviceOffline,
                id: i + 1,
                name: `device-${i + 1}`
            }))
            cy.intercept('GET', '/api/v1/teams/*/devices?statusOnly=true', {
                count: 30,
                devices: allDevices
            }).as('getDeviceStatus')

            // Mock page 1: 25 devices returned, total = 30 → footer shows, 2 pages.
            cy.intercept({
                method: 'GET',
                pathname: '/api/v1/teams/*/devices',
                query: { page: '1' }
            }, {
                count: 30,
                meta: { page: 1, pageSize: 25, total: 30, pageCount: 2 },
                devices: Array.from({ length: 25 }, (_, i) => ({
                    ...deviceOffline,
                    id: i + 1,
                    name: `device-${i + 1}`
                }))
            }).as('getDevicesPage1')

            cy.request('GET', '/api/v1/teams/')
                .then((response) => {
                    const team = response.body.teams[0]
                    cy.visit(`/team/${team.slug}/devices`)
                    cy.wait('@getDevicesPage1')
                })

            // Page 1: full slice rendered, footer present, page-1 button is current.
            cy.get('[data-el="devices-browser"] tbody').find('tr').should('have.length', 25)
            cy.get('[data-el="pagination"]').should('exist')
            cy.get('[data-action="page-1"]').should('have.class', 'ff-btn--primary')
            cy.get('[data-action="page-2"]').should('exist')

            // Mock page 2: remaining 5 devices.
            cy.intercept({
                method: 'GET',
                pathname: '/api/v1/teams/*/devices',
                query: { page: '2' }
            }, {
                count: 30,
                meta: { page: 2, pageSize: 25, total: 30, pageCount: 2 },
                devices: Array.from({ length: 5 }, (_, i) => ({
                    ...deviceOffline,
                    id: 26 + i,
                    name: `device-${26 + i}`
                }))
            }).as('getDevicesPage2')

            cy.get('[data-action="page-2"]').click()
            cy.wait('@getDevicesPage2')

            // Page 2: smaller slice rendered, page-2 button is now current.
            cy.get('[data-el="devices-browser"] tbody').find('tr').should('have.length', 5)
            cy.get('[data-el="devices-browser"] tbody').contains('td', 'device-26')
            cy.get('[data-action="page-2"]').should('have.class', 'ff-btn--primary')
        })

        it('prev/next buttons advance and return between pages', function () {
            const allDevices = Array.from({ length: 30 }, (_, i) => ({
                ...deviceOffline,
                id: i + 1,
                name: `device-${i + 1}`
            }))
            cy.intercept('GET', '/api/v1/teams/*/devices?statusOnly=true', {
                count: 30,
                devices: allDevices
            }).as('getDeviceStatus')

            cy.intercept({
                method: 'GET',
                pathname: '/api/v1/teams/*/devices',
                query: { page: '1' }
            }, {
                count: 30,
                meta: { page: 1, pageSize: 25, total: 30, pageCount: 2 },
                devices: Array.from({ length: 25 }, (_, i) => ({
                    ...deviceOffline,
                    id: i + 1,
                    name: `device-${i + 1}`
                }))
            }).as('getDevicesPage1')

            cy.intercept({
                method: 'GET',
                pathname: '/api/v1/teams/*/devices',
                query: { page: '2' }
            }, {
                count: 30,
                meta: { page: 2, pageSize: 25, total: 30, pageCount: 2 },
                devices: Array.from({ length: 5 }, (_, i) => ({
                    ...deviceOffline,
                    id: 26 + i,
                    name: `device-${26 + i}`
                }))
            }).as('getDevicesPage2')

            cy.request('GET', '/api/v1/teams/')
                .then((response) => {
                    const team = response.body.teams[0]
                    cy.visit(`/team/${team.slug}/devices`)
                    cy.wait('@getDevicesPage1')
                })

            // Prev disabled on page 1; Next advances to page 2.
            cy.get('[data-action="page-prev"]').should('be.disabled')
            cy.get('[data-action="page-next"]').click()
            cy.wait('@getDevicesPage2')
            cy.get('[data-action="page-2"]').should('have.class', 'ff-btn--primary')

            // Next disabled on last page; Prev returns to page 1.
            cy.get('[data-action="page-next"]').should('be.disabled')
            cy.get('[data-action="page-prev"]').click()
            cy.wait('@getDevicesPage1')
            cy.get('[data-action="page-1"]').should('have.class', 'ff-btn--primary')
        })

        it('hides the pagination footer when total fits within the smallest page size', function () {
            const allDevices = Array.from({ length: 5 }, (_, i) => ({
                ...deviceOffline,
                id: i + 1,
                name: `device-${i + 1}`
            }))
            cy.intercept('GET', '/api/v1/teams/*/devices?statusOnly=true', {
                count: 5,
                devices: allDevices
            }).as('getDeviceStatus')

            // Total of 5 ≤ 10 (smallest page-size option) → footer should not render.
            cy.intercept({
                method: 'GET',
                pathname: '/api/v1/teams/*/devices',
                query: { page: '1' }
            }, {
                count: 5,
                meta: { page: 1, pageSize: 25, total: 5, pageCount: 1 },
                devices: Array.from({ length: 5 }, (_, i) => ({
                    ...deviceOffline,
                    id: i + 1,
                    name: `device-${i + 1}`
                }))
            }).as('getDevicesSmall')

            cy.request('GET', '/api/v1/teams/')
                .then((response) => {
                    const team = response.body.teams[0]
                    cy.visit(`/team/${team.slug}/devices`)
                    cy.wait('@getDevicesSmall')
                })

            cy.get('[data-el="devices-browser"] tbody').find('tr').should('have.length', 5)
            cy.get('[data-el="pagination"]').should('not.exist')
        })
    })

    describe('team with devices', () => {
        beforeEach(() => {
            cy.intercept('GET', '/api/*/teams/*/devices*').as('getDevices')
            cy.login('bob', 'bbPassword')
            cy.home()

            cy.request('GET', '/api/v1/user/teams')
                .then((response) => {
                    const team = response.body.teams.find((team) => team.name === 'BTeam')
                    cy.visit(`/team/${team.slug}/devices`)
                    cy.wait('@getDevices')
                })
        })

        // Small dataset (under the pagination footer threshold) — filters still go server-side.
        // This describe complements the multi-page block below by verifying the same flow works
        // when the rows-per-page selector is hidden.
        describe('with a small dataset (no pagination footer)', () => {
            it('can filter the device browser by "last seen" values', () => {
                // ensure we have something "last seen" in the past 1.5 mins
                deviceRunning.lastSeenAt = (new Date()).toISOString()

                cy.intercept('GET', '/api/v1/teams/*/devices?statusOnly=true', {
                    count: 2,
                    devices: [deviceOffline, deviceRunning]
                }).as('getDeviceStatus')

                // Unfiltered initial fetch.
                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { page: '1' }
                }, req => {
                    // Let the per-filter intercepts below handle requests that carry a filter param.
                    if (req.query.filters) return
                    req.reply({
                        count: 2,
                        meta: { page: 1, pageSize: 25, total: 2, pageCount: 1 },
                        devices: [deviceOffline, deviceRunning]
                    })
                }).as('getDevicesUnfiltered')

                cy.visit('/team/bteam/devices')
                cy.wait('@getDevicesUnfiltered')
                cy.contains('device-1')
                cy.contains('device-2')

                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { filters: 'lastseen:never' }
                }, {
                    count: 1,
                    meta: { page: 1, pageSize: 25, total: 1, pageCount: 1 },
                    devices: [deviceOffline]
                }).as('getDevicesFilteredNever')

                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--never').click()
                cy.wait('@getDevicesFilteredNever')
                cy.contains('device-1')
                cy.contains('device-2').should('not.exist')

                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { filters: 'lastseen:running' }
                }, {
                    count: 1,
                    meta: { page: 1, pageSize: 25, total: 1, pageCount: 1 },
                    devices: [deviceRunning]
                }).as('getDevicesFilteredRunning')

                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.wait('@getDevicesFilteredRunning')
                cy.contains('device-1').should('not.exist')
                cy.contains('device-2')
            })

            it('can filter the device browser by "status" values', () => {
                deviceRunning.lastSeenAt = (new Date()).toISOString()

                cy.intercept('GET', '/api/v1/teams/*/devices?statusOnly=true', {
                    count: 2,
                    devices: [deviceOffline, deviceRunning]
                }).as('getDeviceStatus')

                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { page: '1' }
                }, req => {
                    if (req.query.filters) return
                    req.reply({
                        count: 2,
                        meta: { page: 1, pageSize: 25, total: 2, pageCount: 1 },
                        devices: [deviceOffline, deviceRunning]
                    })
                }).as('getDevicesUnfiltered')

                cy.visit('/team/bteam/devices')
                cy.wait('@getDevicesUnfiltered')
                cy.contains('device-1')
                cy.contains('device-2')

                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { filters: 'status:offline' }
                }, {
                    count: 1,
                    meta: { page: 1, pageSize: 25, total: 1, pageCount: 1 },
                    devices: [deviceOffline]
                }).as('getDevicesFilteredOffline')

                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--offline').click()
                cy.wait('@getDevicesFilteredOffline')
                cy.contains('device-1')
                cy.contains('device-2').should('not.exist')

                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { filters: 'status:running' }
                }, {
                    count: 1,
                    meta: { page: 1, pageSize: 25, total: 1, pageCount: 1 },
                    devices: [deviceRunning]
                }).as('getDevicesFilteredRunning')

                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.wait('@getDevicesFilteredRunning')
                cy.contains('device-1').should('not.exist')
                cy.contains('device-2')

                // reverse the filter
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1')
                cy.contains('device-2')
            })
        })

        describe('with a multiple pages page (server side filtering)', () => {
            it('can filter the device browser by "last seen" values', () => {
                const secondOfflineDevice = { ...deviceOffline, name: 'device-3', id: 3 }

                deviceRunning.lastSeenAt = (new Date()).toISOString()
                cy.intercept('GET', '/api/v1/teams/*/devices*', {
                    count: 3,
                    meta: { next_cursor: 'next' },
                    devices: [deviceOffline, deviceRunning]
                }).as('getDevicesWithTwoPages')

                cy.intercept('GET', '/api/v1/teams/*/devices?statusOnly=true', {
                    count: 3,
                    devices: [deviceOffline, deviceRunning, secondOfflineDevice]
                }).as('getDeviceStatus')

                cy.visit('/team/bteam/devices')
                cy.wait('@getDevicesWithTwoPages')
                cy.contains('device-1') // offline
                cy.contains('device-2') // online

                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { filters: 'lastseen:never' }
                }, {
                    count: 1,
                    meta: { next_cursor: null },
                    devices: [deviceOffline, secondOfflineDevice]
                }).as('getDevicesFiltered')

                // apply filter
                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--never').click()
                cy.wait('@getDevicesFiltered')
                cy.contains('device-1') // offline
                cy.contains('device-2').should('not.exist') // online
                cy.contains('device-3') // offline

                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { filters: 'lastseen:running' }
                }, {
                    count: 1,
                    meta: { next_cursor: null },
                    devices: [deviceRunning]
                }).as('getDevicesFiltered')

                // select different filter value
                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1').should('not.exist') // offline
                cy.contains('device-2') // online
                cy.contains('device-3').should('not.exist') // offline

                // remove the filter
                cy.get('[data-el="devicestatus-lastseen"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.wait('@getDevicesWithTwoPages')
                cy.contains('device-1') // offline
                cy.contains('device-2') // online
                cy.contains('device-3').should('not.exist') // not on first page
            })

            it('can filter the device browser by "status" values', () => {
                const secondOfflineDevice = { ...deviceOffline, name: 'device-3', id: '3' }
                cy.intercept('GET', '/api/v1/teams/*/devices*', {
                    count: 3,
                    meta: { next_cursor: 'next' },
                    devices: [deviceOffline, deviceRunning]
                }).as('getDevicesWithTwoPages')

                cy.intercept('GET', '/api/v1/teams/*/devices?statusOnly=true', {
                    count: 3,
                    devices: [deviceOffline, deviceRunning, secondOfflineDevice]
                }).as('getDeviceStatus')

                cy.visit('/team/bteam/devices')
                cy.wait('@getDevicesWithTwoPages')
                cy.contains('device-1') // offline
                cy.contains('device-2') // running

                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { filters: 'status:offline' }
                }, {
                    count: 1,
                    meta: { next_cursor: null },
                    devices: [deviceOffline, secondOfflineDevice]
                }).as('getDevicesFiltered')

                // apply filter
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--offline').click()
                cy.wait('@getDevicesFiltered')
                cy.contains('device-1') // offline
                cy.contains('device-2').should('not.exist') // running
                cy.contains('device-3') // offline

                cy.intercept({
                    method: 'GET',
                    pathname: '/api/v1/teams/*/devices',
                    query: { filters: 'status:running' }
                }, {
                    count: 1,
                    meta: { next_cursor: null },
                    devices: [deviceRunning]
                }).as('getDevicesFiltered')

                // select different filter value
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1').should('not.exist') // offline
                cy.contains('device-2') // running
                cy.contains('device-3').should('not.exist') // offline

                // remove the filter
                cy.get('[data-el="devicestatus-status"] .ff-chart-bar.ff-chart-bar--running').click()
                cy.contains('device-1') // offline
                cy.contains('device-2') // running
                cy.contains('device-3').should('not.exist') // back to first page only
            })
        })

        it('can assign and unassign devices to instances', () => {
            let selectedInstance

            cy.intercept('PUT', '/api/v1/devices/*').as('updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                // bypass sticky header
                cy.get('[data-el="row-team2-unassigned-device"]').parent().parent().parent().scrollTo('topRight')
                cy.get('[data-el="row-team2-unassigned-device"] [data-el="kebab-menu"]').click({ scrollBehavior: false })
            })
            cy.get('[data-el="kebab-options"].ff-kebab-options').find('[data-action="device-assign-to-instance"]').click()

            // Dialog
            cy.get('[data-el="assign-device-to-instance-dialog"]')
                .should('be.visible')

            cy.get('[data-el="assign-device-to-instance-dialog"]')
                .within(() => {
                    // Application dropdown
                    cy.get('[data-form="application"]').within(() => {
                        cy.get('[data-el="dropdown"]').should('not.be.disabled')
                        cy.get('.ff-listbox').click()
                    })
                })

            // Click first Application
            cy.get('[data-el="listbox-options"] > .ff-option:first').click()

            cy.get('[data-el="assign-device-to-instance-dialog"]')
                .within(() => {
                    // Instance dropdown
                    cy.get('[data-form="instance"]').within(() => {
                        cy.get('.ff-listbox').should('not.be.disabled')
                        cy.get('.ff-listbox').click()
                    })
                })
            // Grab name of first instance
            cy.get('[data-el="listbox-options"]').should('be.visible')
            cy.get('[data-el="listbox-options"] > .ff-option:first').invoke('text').then((text) => {
                selectedInstance = text
            })

            // Click first instance
            cy.get('[data-el="listbox-options"] > .ff-option:first').click()

            cy.get('[data-el="assign-device-to-instance-dialog"]')
                .within(() => {
                    cy.get('.ff-btn--primary').click()
                })

            cy.wait('@updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.contains(selectedInstance)
                    cy.get('.ff-kebab-menu').click({ scrollBehavior: false })
                })
            })
            cy.get('[data-el="kebab-options"].ff-kebab-options').find('[data-action="device-remove-from-instance"]').click()

            // Remove dialog
            cy.get('[data-el="platform-dialog"]')
                .should('be.visible')

            cy.get('[data-el="platform-dialog"]')
                .within(() => {
                    cy.get('.ff-btn--danger').click()
                })

            cy.wait('@updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').should('not.have.text', selectedInstance)
            })

            // Option to re-assign is still available
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.get('.ff-kebab-menu').click({ scrollBehavior: false })
                })
            })
            cy.get('[data-el="kebab-options"].ff-kebab-options').find('[data-action="device-assign-to-instance"]')
        })

        it('can assign and unassign devices to application', () => {
            let selectedApplication

            cy.intercept('PUT', '/api/v1/devices/*').as('updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.get('[data-el="row-team2-unassigned-device"]').parent().parent().parent().scrollTo('topRight')
                cy.get('[data-el="row-team2-unassigned-device"] [data-el="kebab-menu"]').click({ scrollBehavior: false })
            })
            cy.get('[data-el="kebab-options"].ff-kebab-options').find('[data-action="device-assign-to-application"]').click()

            // Dialog
            cy.get('[data-el="assign-device-to-application-dialog"]')
                .should('be.visible')

            cy.get('[data-el="assign-device-to-application-dialog"]')
                .within(() => {
                    // Instance dropdown
                    cy.get('[data-form="application"]').within(() => {
                        cy.get('.ff-listbox').should('not.be.disabled')
                        cy.get('.ff-listbox').click({ scrollBehavior: false })
                    })
                })
            // Grab name of first application
            cy.get('.ff-options').should('be.visible')
            cy.get('.ff-options > .ff-option:first').invoke('text').then((text) => {
                selectedApplication = text
            })
            cy.get('.ff-options > .ff-option:first').click()
            cy.get('[data-el="assign-device-to-application-dialog"]')
                .within(() => {
                    // chose the first application by clicking the primary button within the dialog
                    cy.get('.ff-btn--primary').click()
                })

            cy.wait('@updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.contains(selectedApplication)

                    cy.get('.ff-kebab-menu').click({ scrollBehavior: false })
                })
            })
            cy.get('[data-el="kebab-options"].ff-kebab-options').find('[data-action="device-remove-from-application"]').click()

            // Remove dialog
            cy.get('[data-el="platform-dialog"]')
                .should('be.visible')

            cy.get('[data-el="platform-dialog"]')
                .within(() => {
                    cy.get('.ff-btn--danger').click()
                })

            cy.wait('@updateDevice')

            // Devices list
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').should('not.have.text', selectedApplication)
            })

            // Option to re-assign is still available
            cy.get('[data-el="devices-browser"]').within(() => {
                // Row
                cy.contains('tr', 'team2-unassigned-device').within(() => {
                    cy.get('.ff-kebab-menu').click({ scrollBehavior: false })
                })
            })
            cy.get('[data-el="kebab-options"].ff-kebab-options').find('[data-action="device-assign-to-application"]')
        })
    })
})

describe('FlowFuse stores device audit logs', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/team/ateam/audit-log')
    })

    it('when a device is registered', () => {
        cy.get('.ff-audit-entry').contains('New Device Created')
    })

    it('when a device is deleted', () => {
        cy.get('.ff-audit-entry').contains('Device Deleted')
    })
})
