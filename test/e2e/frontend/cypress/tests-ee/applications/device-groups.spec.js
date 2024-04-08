import applicationDevices from '../../fixtures/device-groups/application-devices.json'
import deviceGroup1 from '../../fixtures/device-groups/device-group-1.json'

describe('FlowForge - Application - Device Groups', () => {
    let application
    function loadApplication (teamName, applicationName) {
        cy.request('GET', '/api/v1/user/teams')
            .then((response) => {
                const team = response.body.teams.find(
                    (team) => team.name === teamName
                )
                return cy.request('GET', `/api/v1/teams/${team.id}/applications`)
            })
            .then((response) => {
                application = response.body.applications.find(
                    (app) => app.name === applicationName
                )
                applicationDevices.devices.forEach((device) => {
                    device.application.id = application.id
                    device.application.name = application.name
                })
                deviceGroup1.application.id = application.id
                deviceGroup1.application.name = application.name
            })
    }

    beforeEach(() => {
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')

        cy.login('bob', 'bbPassword')
        cy.home()
        loadApplication('BTeam', 'application-2')
    })

    describe('Device Groups Overview', () => {
        it('can navigate to the /device-groups page with EE license', () => {
            // // provide the device groups fixture
            // cy.intercept('GET', '/api/*/applications/*/device-groups', groups).as('getDeviceGroups')
            cy.visit(`/application/${application.id}`) // open the application page
            // navigate to the device groups tab
            cy.get('[data-nav="application-devices-groups-overview"]').should('exist').click()
            // check the url is correct
            cy.url().should('include', `/application/${application.id}/device-groups`)
            // check the device groups are displayed
            cy.get('[data-el="device-groups-table"] tbody').find('tr').should('have.length', 1)
            // check the column data is present & correct
            cy.get('[data-el="device-groups-table"] tbody').find('tr').eq(0).find('td').eq(0).should('have.text', 'application-device-group-a')
            cy.get('[data-el="device-groups-table"] tbody').find('tr').eq(0).find('td').eq(1).should('have.text', 'an unnamed device group')
            // the next cell has the snapshot it contains spans with the name and the id
            cy.get('[data-el="device-groups-table"] tbody > tr:nth-child(1) > td [data-el="snapshot-name"]').should('have.text', 'none')
            cy.get('[data-el="device-groups-table"] tbody > tr:nth-child(1) > td [data-el="snapshot-id"]').should('not.exist')
            // last cell has the count of devices in the group
            cy.get('[data-el="device-groups-table"] tbody').find('tr').eq(0).find('td').eq(3).should('have.text', '1')
        })

        it.skip('can create device-group', () => {
            // TODO
        })
    })

    describe('Device Group', () => {
        it('can navigate to the /device-group/xxxxxxxx/devices page with EE license', () => {
            cy.visit(`/application/${application.id}`) // open the application page
            // navigate to the device groups tab
            cy.get('[data-nav="application-devices-groups-overview"]').should('exist').click()
            // check the url is correct
            cy.url().should('include', `/application/${application.id}/device-groups`)

            // the page should show a list of device groups and the rows should be clickable
            // click on the first row
            cy.get('[data-el="device-groups-table"] tbody').find('tr').eq(0).click()

            // the url should match /application/${application.id}/device-group/<alphanumeric-id>/devices
            cy.url().should('match', new RegExp(`/application/${application.id}/device-group/[a-zA-Z0-9]+/devices`))

            // check the target snapshot is displayed upper right
            cy.get('[data-el="device-group-target-snapshot"]').should('exist')
            cy.get('[data-el="device-group-target-snapshot"] [data-el="snapshot-name"]').should('have.text', 'No Target Snapshot Set')
            cy.get('[data-el="device-group-target-snapshot"] [data-el="snapshot-id"]').should('not.exist')

            // check the table is displayed and contains 1 device and the columns are correct
            // columns: Name, Type, Active Snapshot
            cy.get('[data-el="device-group-members"] tbody').find('tr').should('have.length', 1)
            cy.get('[data-el="device-group-members"] tbody').find('tr').eq(0).find('td').eq(0).should('have.text', 'application-device-b')
            cy.get('[data-el="device-group-members"] tbody').find('tr').eq(0).find('td').eq(1).should('have.text', 'application-device-b')
            // the next cell has the snapshot it contains spans with the name and the id
            cy.get('[data-el="device-group-members"] tbody > tr:nth-child(1) > td [data-el="snapshot-name"]').should('have.text', 'none')
            cy.get('[data-el="device-group-members"] tbody > tr:nth-child(1) > td [data-el="snapshot-id"]').should('not.exist')
        })
        it('snapshot info is displayed', () => {
            // override the fixtures with the devices having snapshots
            cy.intercept('GET', '/api/*/applications/*/device-groups/*', deviceGroup1).as('getDeviceGroup')
            cy.intercept('GET', '/api/*/applications/*/devices', applicationDevices).as('getApplicationDevices')

            // open the application page
            cy.visit(`/application/${application.id}`)
            // navigate to the device groups tab
            cy.get('[data-nav="application-devices-groups-overview"]').should('exist').click()
            // check the url is correct
            cy.url().should('include', `/application/${application.id}/device-groups`)

            // the page should show a list of device groups and the rows should be clickable
            // click on the first row
            cy.get('[data-el="device-groups-table"] tbody').find('tr').eq(0).click()

            // the url should match /application/${application.id}/device-group/<alphanumeric-id>/devices
            cy.url().should('match', new RegExp(`/application/${application.id}/device-group/[a-zA-Z0-9]+/devices`))

            // check the target snapshot is displayed upper right
            cy.get('[data-el="device-group-target-snapshot"]').should('exist')
            cy.get('[data-el="device-group-target-snapshot"] [data-el="snapshot-name"]').should('have.text', 'V1')
            cy.get('[data-el="device-group-target-snapshot"] [data-el="snapshot-id"]').should('have.text', 'snapv1')

            // check the table is displayed and contains 2 devices and the columns are correct
            // columns: Name, Type, Active Snapshot
            cy.get('[data-el="device-group-members"] tbody').find('tr').should('have.length', 2)
            // **Device 1**: has active snapshot V1
            cy.get('[data-el="device-group-members"] tbody').find('tr').eq(0).find('td').eq(0).should('have.text', 'Device 1')
            cy.get('[data-el="device-group-members"] tbody').find('tr').eq(0).find('td').eq(1).should('have.text', 'Device 1')
            // the next cell has the snapshot it contains spans with the name and the id
            cy.get('[data-el="device-group-members"] tbody > tr:nth-child(1) > td [data-el="snapshot-name"]').should('have.text', 'V1')
            cy.get('[data-el="device-group-members"] tbody > tr:nth-child(1) > td [data-el="snapshot-id"]').should('have.text', 'snapv1')

            // **Device 2**: has active snapshot V2
            cy.get('[data-el="device-group-members"] tbody').find('tr').eq(1).find('td').eq(0).should('have.text', 'Device 2')
            cy.get('[data-el="device-group-members"] tbody').find('tr').eq(1).find('td').eq(1).should('have.text', 'Device 2')
            // the next cell has the snapshot it contains spans with the name and the id
            cy.get('[data-el="device-group-members"] tbody > tr:nth-child(2) > td [data-el="snapshot-name"]').should('have.text', 'V2')
            cy.get('[data-el="device-group-members"] tbody > tr:nth-child(2) > td [data-el="snapshot-id"]').should('have.text', 'snapv2')
        })
    })
})
