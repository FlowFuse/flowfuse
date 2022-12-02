import deviceOffline from '../fixtures/device-offline.json'

describe('FlowForge - Devices', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/teams/*/devices').as('getDevices')
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
        cy.get('main').contains('You don\'t have any devices yet')
    })

    it('provides functionality to register a device', () => {
        cy.intercept('POST', '/api/*/devices').as('registerDevice')

        cy.get('button[data-action="register-device"]').click()

        cy.get('.ff-dialog-box').should('be.visible')
        cy.get('.ff-dialog-header').contains('Register Device')
        // disabled primary button by default
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').contains('Register').should('be.disabled')

        cy.get('[data-form="device-name"] input[type="text"]').type('device1')
        // inserting device name is enough to enable button
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').should('not.be.disabled')
        cy.get('[data-form="device-type"] input[type="text"]').type('typeA')

        // click "Register"
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--primary').contains('Register').click()

        cy.wait('@registerDevice')

        // show user the device credentials
        cy.get('.ff-dialog-box').should('be.visible')
        cy.get('.ff-dialog-header').contains('Device Credentials')

        cy.get('[data-el="devices"] tbody').find('tr').should('have.length', 1)
        cy.get('[data-el="devices"] tbody').find('tr').contains('device1')
    })

    it('can delete a device', () => {
        cy.intercept('DELETE', '/api/*/devices/*').as('deleteDevice')

        // click kebab menu in row 1
        cy.get('[data-el="devices"] tbody').find('.ff-kebab-menu').eq(0).click()
        // click the 4th option (Delete Device)
        cy.get('[data-el="devices"] tbody .ff-kebab-menu .ff-kebab-options').find('.ff-list-item').contains('Delete Device').click()

        cy.get('.ff-dialog-box').should('be.visible')
        cy.get('.ff-dialog-header').contains('Delete Device')

        // Click "Delete"
        cy.get('.ff-dialog-box button.ff-btn.ff-btn--danger').contains('Delete').click()

        cy.wait('@deleteDevice')

        cy.get('main').contains('You don\'t have any devices yet')
    })

    it('can load multiple pages of devices when the API paginates', function () {
        // Mock active and inactive stacks having multiple pages
        cy.intercept('GET', '/api/v1/teams/*/devices', {
            count: 2,
            meta: { next_cursor: 'next' },
            devices: [deviceOffline]
        }).as('getDevicesPaginated')

        cy.request('GET', '/api/v1/teams/')
            .then((response) => {
                const team = response.body.teams[0]
                cy.visit(`/team/${team.slug}/devices`)
                cy.wait('@getDevicesPaginated')
            })

        // Load more active
        cy.get('[data-el="devices"] tbody').find('tr').should('have.length', 1)

        cy.intercept('GET', '/api/v1/teams/*/devices?cursor=next', {
            count: 2,
            meta: { next_cursor: null },
            devices: [{ ...deviceOffline, ...{ id: 2, name: 'device-2' } }]
        }).as('getDevicesNextPage')

        cy.get('[data-action="load-more"]').click()

        cy.wait('@getDevicesNextPage')

        cy.get('[data-el="devices"] tbody').find('tr').should('have.length', 2)
        cy.get('[data-el="devices"] tbody').contains('td', 'device-2')

        cy.get('[data-action="load-more"]').should('not.exist')
    })
})

describe('FlowForge stores device audit logs', () => {
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
