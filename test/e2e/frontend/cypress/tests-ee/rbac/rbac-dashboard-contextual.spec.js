describe.skip('FlowFuse - RBAC Dashboard Contextual permissions', () => {
    let team
    let instances
    let devices
    let applications
    before(() => {
        cy.intercept('GET', '/api/*/user/teams').as('getTeams')

        cy.login('adminAllan', 'aaPassword')

        cy.visit('/')

        cy.wait('@getTeams').then(({ response }) => {
            team = response.body.teams.find(t => t.slug === 'rbac-team')
            const teamId = team.id

            cy.intercept('GET', `/api/*/teams/${teamId}/projects`).as('getProjects')

            cy.get('[data-nav="team-instances"]').click()

            return cy.wait('@getProjects')
        })
            .then(({ response }) => {
                instances = response.body.projects
            })
            .then(() => {
                cy.intercept('GET', `/api/*/teams/${team.id}/devices`).as('getDevices')
                cy.get('[data-nav="team-devices"]').click()
                return cy.wait('@getDevices')
            })
            .then(({ response }) => {
                devices = response.body.devices
            })
            .then(() => {
                cy.intercept('GET', `/api/*/teams/${team.id}/applications*`).as('getApplications')
                cy.get('[data-nav="team-applications"]').click()
                return cy.wait('@getApplications')
            })
            .then(({ response }) => {
                applications = response.body.applications
            })
            .then(() => cy.logout())
    })

    beforeEach(() => {
        cy.login('dashboardDan', 'ddPassword')
        cy.home()
    })

    // dashboard
    it('should not have restricted remote instances listed on the dashboard page', () => {
        cy.get('[data-el="dashboard-section-hosted"]').within(() => {
            // out of 6 teams with 1 instance each, one team has restricted role, for another viewer role
            // resulting in 4 running, 0 error, 0 stopped
            // should display 3 instance tiles
            // should display has more with one more available
            cy.get('[data-state="running"]').contains('4')
            cy.get('[data-state="error"]').contains('0')
            cy.get('[data-state="stopped"]').contains('0')
            cy.get('[data-el="instance-tile"]').should('have.length', 3)
            cy.get('[data-el="has-more"]').contains('1 More')
        })
        cy.get('[data-el="dashboard-section-remote"]').within(() => {
            // out of 6 teams with 2 instances each, one team has restricted role, for another viewer role
            // resulting in 0 running, 0 error, 8 stopped
            // should display 3 instance tiles
            // should display has more with one more available
            cy.get('[data-state="running"]').contains('0')
            cy.get('[data-state="error"]').contains('0')
            cy.get('[data-state="stopped"]').contains('10')
            cy.get('[data-el="device-tile"]').should('have.length', 3)
            cy.get('[data-el="has-more"]').contains('7 More')
        })
    })
    it.skip('should not have recent activity items pertaining restricted instances on the dashboard page', () => {
        // tricky to test
    })

    // hosted instances
    it('should not have direct access to a hosted instance when accessing via url', () => {
        // application-1-instance-1 & application-2-instance-1 are restricted
        const application1Instance1 = instances.find(i => i.name === 'application-1-instance-1')
        const application2Instance1 = instances.find(i => i.name === 'application-2-instance-1')

        cy.visit(`/instance/${application1Instance1.id}`)
        cy.get('[data-page="not-found"]').should('exist')

        cy.home()

        cy.visit(`/instance/${application2Instance1.id}`)
        cy.get('[data-page="not-found"]').should('exist')
    })
    it('should not have restricted hosted instances listed in the instances page', () => {
        cy.get('[data-nav="team-instances"]').click()

        cy.get('[data-el="instances-table"]').within(() => {
            cy.get('[data-el="row-application-1-instance-1"]').should('not.exist')
            cy.get('[data-el="row-application-2-instance-1"]').should('not.exist')

            // the user has a viewer role in this application
            cy.get('[data-el="row-application-3-instance-1"]').should('exist')
            cy.get('[data-el="row-application-3-instance-1"] [data-el="kebab-menu"]').should('not.exist')

            // the user has a member role in this application
            cy.get('[data-el="row-application-4-instance-1"]').should('exist')
            cy.get('[data-el="row-application-4-instance-1"] [data-el="kebab-menu"]').should('not.exist')

            // the user has an owner role in this application
            cy.get('[data-el="row-application-5-instance-1"]').should('exist')
            cy.get('[data-el="row-application-5-instance-1"] [data-el="kebab-menu"]').should('exist')

            // the user has his team role in this application
            cy.get('[data-el="row-application-6-instance-1"]').should('exist')
            cy.get('[data-el="row-application-6-instance-1"] [data-el="kebab-menu"]').should('exist')
        })
    })
    it('should not be able to access hosted instance actions belonging to applications of viewer role', () => {
        cy.intercept('GET', '/api/*/teams/1/applications').as('getApplications')
        cy.intercept('GET', '/api/*/projects/*/devices').as('getDevices')

        // the user should have a viewer role in this application
        const applicationViewerRoleApp = instances.find(i => i.name === 'application-3-instance-1')

        cy.visit(`/instance/${applicationViewerRoleApp.id}`)

        // check instance overview page
        cy.get('[data-el="action-button"]').should('not.exist')
        cy.get('[data-action="open-editor"]').should('exist').should('not.be.disabled')
        cy.get('[data-action="open-dashboard"]').should('exist').should('not.be.disabled')
        cy.get('[data-el="recent-activity"]').should('exist')

        // go to devices page
        //      check that the user can't add a device
        //      check that the user can't edit a device
        //      check the user can't select devices)
        cy.get('[data-nav="instance-remote"]').click()
        cy.wait('@getDevices')
        cy.get('[data-el="bulk-actions-dropdown"]').should('not.exist')
        cy.get('[data-action="change-target-snapshot"]').should('not.exist')
        cy.get('[data-action="register-device"]').should('not.exist')
        cy.get('[data-el="ff-data-cell"] .ff-checkbox').should('not.exist')

        // go to version history page
        //      check that the user sees the version history
        //      check that the user can download package.json but can't access any other action items on hostory items
        cy.get('[data-nav="instance-version-history"]').click()
        cy.get('[data-action="create-snapshot"]').should('not.exist')
        cy.get('[data-el="loading"]').should('not.exist')
        cy.get('[data-el="timeline-list"]').should('exist')
        cy.get('[data-el="timeline-list"] [data-el="timeline-event-snapshot-created"]')
            .within(() => {
                cy.get('[data-el="kebab-menu"]').click()
            })
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-restore-snapshot"]')
            .should('exist').should('have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-edit-snapshot"]')
            .should('exist').should('have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-view-snapshot"]')
            .should('exist').should('have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-download-snapshot"]')
            .should('exist').should('have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-download-packagejson"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-set-as-device-target"]')
            .should('exist').should('have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-delete-snapshot"]')
            .should('exist').should('have.class', 'disabled')

        // go to version history snapshots page
        //      check that the user sees snapshots'
        //      check that the user can download package json
        //      check that the user can't access any other action items on snapshots
        cy.get('[data-nav="page-toggle"]').contains('Snapshots').click()
        cy.get('[data-el="row-snapshot-1"]').click()
        cy.get('[data-el="snapshot-details-drawer"]').should('exist')
        cy.get('[data-action="edit"]').should('not.exist')
        cy.get('[data-action="restore"]').should('not.exist')
        cy.get('[data-el="snapshot-details-drawer"]')
            .within(() => {
                cy.get('[data-action="download-snapshot"]').should('exist').should('be.disabled')
                cy.get('[data-action="download-package-json"]').should('exist').should('not.be.disabled')
                cy.get('[data-action="set-as"]').should('exist').should('be.disabled')
                cy.get('[data-action="delete"]').should('exist').should('be.disabled')
            })
        // close the drawer
        // eslint-disable-next-line cypress/require-data-selectors
        cy.get('body').type('{esc}')

        // check that the user doesn't have access to the assets tab similarly to the team roled user
        cy.get('[data-nav="instance-assets"]').should('not.exist')
        cy.visit(`/instance/${applicationViewerRoleApp.id}/assets`)
        cy.get('[data-el="instance-overview"]').should('exist')

        // check that the user has access to the audit log tab similarly to the team roled user
        //      check that the user has access to the audit log
        cy.get('[data-nav="instance-activity"]').click()
        cy.get('[data-el="audit-log"]').should('exist')
        cy.get('[data-el="audit-log"]').contains('Instance Snapshot Created')
        cy.get('[data-el="audit-log"]').contains('Instance Created')

        // check that the user has access to the logs tab similarly to the team roled user
        //      check that the user has access to the logs
        cy.get('[data-nav="instance-logs"]').click()
        cy.get('[data-el="instance-logs"]').should('exist')

        // check that the user has access to the performance tab similarly to the team roled user
        //      check that the user has access to the performance metrics
        cy.get('[data-nav="instance-performance"]').click()
        cy.get('[data-el="empty-state"]').contains('Performance Insights')

        // check that the user has access to the settings tab similarly to the team roled user
        //      check that the user has access to the general instance details & hosting section
        //      check that the user doesn't have access to the other general details
        cy.get('[data-nav="instance-settings"]').click()
        cy.get('[data-el="instance-settings"]').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Instance Details').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Hosting').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Change Instance Node-RED Version').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Copy Instance').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Import Instance').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Change Instance Type').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Suspend Instance').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Delete Instance').should('not.exist')

        // check that the user has access to the settings environment tab similarly to the team roled user
        cy.get('[data-nav="environment"]').click()
        cy.get('[data-action="import-env"]').should('not.exist')
        cy.get('[data-el="add-variable"]').should('not.exist')

        // check that the user doesn't have access to the following settings tab similarly to the team roled user (or direct access to the tabs via url
        //      Protect Instance
        //      Editor
        //      Security
        //      Palette
        //      Launcher
        //      Alerts
        cy.get('[data-el="instance-settings"] [data-nav="general"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="environment"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="high-availability"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="protect-instance"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="editor"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="security"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="palette"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="launcher"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="alerts"]').should('not.exist')
        // check direct url access as well
        const protectedRoutes = [
            'protectInstance',
            'ha',
            'editor',
            'security',
            'palette',
            'change-type',
            'launcher',
            'alerts'
        ]
        protectedRoutes.forEach(tab => {
            cy.visit(`/instance/${applicationViewerRoleApp.id}/settings/${tab}`)
            cy.get('[data-el="instance-settings-general"]').should('exist')
        })
    })
    it('should be able to access hosted instance actions belonging to applications of member role', () => {
        cy.intercept('GET', '/api/*/teams/1/applications').as('getApplications')
        cy.intercept('GET', '/api/*/projects/*/devices').as('getDevices')

        // the user should have a member role in this application
        const memberRoleApp = instances.find(i => i.name === 'application-4-instance-1')

        cy.visit(`/instance/${memberRoleApp.id}`)

        // check instance overview page
        cy.get('[data-el="action-button"]').should('not.exist')
        cy.get('[data-action="open-editor"]').should('exist').should('not.be.disabled')
        cy.get('[data-action="open-dashboard"]').should('exist').should('not.be.disabled')
        cy.get('[data-el="recent-activity"]').should('exist')

        // go to devices page
        //      check that the user can't add a device
        //      check that the user can't edit a device
        //      check the user can't select devices)
        cy.get('[data-nav="instance-remote"]').click()
        cy.wait('@getDevices')
        cy.get('[data-el="bulk-actions-dropdown"]').should('not.exist')
        cy.get('[data-action="change-target-snapshot"]').should('exist')
        cy.get('[data-action="register-device"]').should('not.exist')
        cy.get('[data-el="ff-data-cell"] .ff-checkbox').should('not.exist')

        // go to version history page
        //      check that the user sees the version history
        //      check that the user can download package.json but can't access any other action items on hostory items
        cy.get('[data-nav="instance-version-history"]').click()
        cy.get('[data-action="create-snapshot"]').should('exist')
        cy.get('[data-nav="instance-version-history"]').click()
        cy.get('[data-action="create-snapshot"]').should('exist')
        cy.get('[data-el="loading"]').should('not.exist')
        cy.get('[data-el="timeline-list"]').should('exist')
        cy.get('[data-el="timeline-list"] [data-el="timeline-event-snapshot-created"]')
            .within(() => {
                cy.get('[data-el="kebab-menu"]').click()
            })
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-restore-snapshot"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-edit-snapshot"]')
            .should('exist').should('have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-view-snapshot"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-download-snapshot"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-download-packagejson"]')
            .should('exist').should('not.not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-set-as-device-target"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-delete-snapshot"]')
            .should('exist').should('have.class', 'disabled')

        // go to version history snapshots page
        cy.get('[data-nav="page-toggle"]').contains('Snapshots').click()
        cy.get('[data-el="row-snapshot-1"]').click()
        cy.get('[data-el="snapshot-details-drawer"]').should('exist')
        cy.get('[data-action="edit"]').should('not.exist')
        cy.get('[data-action="restore"]').should('exist')
        cy.get('[data-el="snapshot-details-drawer"]')
            .within(() => {
                cy.get('[data-action="download-snapshot"]').should('exist').should('not.be.disabled')
                cy.get('[data-action="download-package-json"]').should('exist').should('not.be.disabled')
                cy.get('[data-action="set-as"]').should('exist').should('not.be.disabled')
                cy.get('[data-action="delete"]').should('exist').should('be.disabled')
            })

        // close the drawer
        // eslint-disable-next-line cypress/require-data-selectors
        cy.get('body').type('{esc}')

        // check that the user doesn't have access to the assets tab similarly to the team roled user
        cy.get('[data-nav="instance-assets"]').should('exist')

        // check that the user has access to the audit log tab similarly to the team roled user
        //      check that the user has access to the audit log
        cy.get('[data-nav="instance-activity"]').click()
        cy.get('[data-el="audit-log"]').should('exist')
        cy.get('[data-el="audit-log"]').should('exist')
        cy.get('[data-el="audit-log"]').contains('Instance Snapshot Created')
        cy.get('[data-el="audit-log"]').contains('Instance Created')

        // check that the user has access to the logs tab similarly to the team roled user
        //      check that the user has access to the logs
        cy.get('[data-nav="instance-logs"]').click()
        cy.get('[data-el="instance-logs"]').should('exist')

        // check that the user has access to the performance tab similarly to the team roled user
        //      check that the user has access to the performance metrics
        cy.get('[data-nav="instance-performance"]').click()
        cy.get('[data-el="empty-state"]').contains('Performance Insights')

        // check that the user has access to the settings tab similarly to the team roled user
        //      check that the user has access to the general instance details & hosting section
        //      check that the user doesn't have access to the other general details
        cy.get('[data-nav="instance-settings"]').click()
        cy.get('[data-el="instance-settings"]').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Instance Details').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Hosting').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Change Instance Node-RED Version').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Copy Instance').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Import Instance').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Change Instance Type').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Suspend Instance').should('not.exist')
        cy.get('[data-el="instance-settings"]').contains('Delete Instance').should('not.exist')

        // check that the user has access to the settings environment tab similarly to the team roled user
        cy.get('[data-nav="environment"]').click()
        cy.get('[data-action="import-env"]').should('exist')
        cy.get('[data-el="add-variable"]').should('exist')

        // check that the user doesn't have access to the following settings tab similarly to the team roled user (or direct access to the tabs via url
        //      Protect Instance
        //      Editor
        //      Security
        //      Palette
        //      Launcher
        //      Alerts
        cy.get('[data-el="instance-settings"] [data-nav="general"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="environment"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="high-availability"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="protect-instance"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="editor"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="security"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="palette"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="launcher"]').should('not.exist')
        cy.get('[data-el="instance-settings"] [data-nav="alerts"]').should('not.exist')
        // check direct url access as well
        const protectedRoutes = [
            'protectInstance',
            'ha',
            'editor',
            'security',
            'palette',
            'change-type',
            'launcher',
            'alerts'
        ]
        protectedRoutes.forEach(tab => {
            cy.visit(`/instance/${memberRoleApp.id}/settings/${tab}`)
            cy.get('[data-el="instance-settings-general"]').should('exist')
        })
    })
    it('should be able to access hosted instance actions belonging to applications of owner role', () => {
        cy.intercept('GET', '/api/*/teams/1/applications').as('getApplications')
        cy.intercept('GET', '/api/*/projects/*/devices').as('getDevices')

        // the user should have the owner role in this application
        const ownerRoleApp = instances.find(i => i.name === 'application-5-instance-1')

        cy.visit(`/instance/${ownerRoleApp.id}`)

        // check instance overview page
        cy.get('[data-el="action-button"]').should('not.exist')
        cy.get('[data-action="open-editor"]').should('exist').should('not.be.disabled')
        cy.get('[data-action="open-dashboard"]').should('exist').should('not.be.disabled')
        cy.get('[data-el="recent-activity"]').should('exist')

        // go to devices page
        //      check that the user can't add a device
        //      check that the user can't edit a device
        //      check the user can't select devices)
        cy.get('[data-nav="instance-remote"]').click()
        cy.wait('@getDevices')
        cy.get('[data-el="bulk-actions-dropdown"]').should('exist')
        cy.get('[data-action="change-target-snapshot"]').should('exist')
        cy.get('[data-action="register-device"]').should('exist')
        cy.get('[data-el="ff-data-cell"] .ff-checkbox').should('exist')

        // go to version history page
        //      check that the user sees the version history
        //      check that the user can download package.json but can't access any other action items on hostory items
        cy.get('[data-nav="instance-version-history"]').click()
        cy.get('[data-action="create-snapshot"]').should('exist')
        cy.get('[data-el="loading"]').should('not.exist')
        cy.get('[data-el="timeline-list"]').should('exist')
        cy.get('[data-el="timeline-list"] [data-el="timeline-event-snapshot-created"]')
            .within(() => {
                cy.get('[data-el="kebab-menu"]').click()
            })
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-restore-snapshot"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-edit-snapshot"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-view-snapshot"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-download-snapshot"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-download-packagejson"]')
            .should('exist').should('not.not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-set-as-device-target"]')
            .should('exist').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-options"] [data-el="kebab-item-delete-snapshot"]')
            .should('exist').should('not.have.class', 'disabled')

        // go to version history snapshots page
        cy.get('[data-nav="page-toggle"]').contains('Snapshots').click()
        cy.get('[data-el="row-snapshot-1"]').click()
        cy.get('[data-el="snapshot-details-drawer"]').should('exist')
        cy.get('[data-action="edit"]').should('exist')
        cy.get('[data-action="restore"]').should('exist')
        cy.get('[data-el="snapshot-details-drawer"]')
            .within(() => {
                cy.get('[data-action="download-snapshot"]').should('exist').should('not.be.disabled')
                cy.get('[data-action="download-package-json"]').should('exist').should('not.be.disabled')
                cy.get('[data-action="set-as"]').should('exist').should('not.be.disabled')
                cy.get('[data-action="delete"]').should('exist').should('not.be.disabled')
            })

        // close the drawer
        // eslint-disable-next-line cypress/require-data-selectors
        cy.get('body').type('{esc}')

        // check that the user has access to the assets tab similarly to the team roled user
        cy.get('[data-nav="instance-assets"]').should('exist')

        // check that the user has access to the audit log tab similarly to the team roled user
        //      check that the user has access to the audit log
        cy.get('[data-nav="instance-activity"]').click()
        cy.get('[data-el="audit-log"]').should('exist')
        cy.get('[data-el="audit-log"]').should('exist')
        cy.get('[data-el="audit-log"]').should('exist')
        cy.get('[data-el="audit-log"]').contains('Instance Snapshot Created')
        cy.get('[data-el="audit-log"]').contains('Instance Created')

        // check that the user has access to the logs tab similarly to the team roled user
        //      check that the user has access to the logs
        cy.get('[data-nav="instance-logs"]').click()
        cy.get('[data-el="instance-logs"]').should('exist')

        // check that the user has access to the performance tab similarly to the team roled user
        //      check that the user has access to the performance metrics
        cy.get('[data-nav="instance-performance"]').click()
        cy.get('[data-el="empty-state"]').contains('Performance Insights')

        // check that the user has access to the settings tab similarly to the team roled user
        //      check that the user has access to the general instance details & hosting section
        //      check that the user doesn't have access to the other general details
        cy.get('[data-nav="instance-settings"]').click()
        cy.get('[data-el="instance-settings"]').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Instance Details').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Hosting').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Change Instance Node-RED Version').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Copy Instance').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Import Instance').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Change Instance Type').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Suspend Instance').should('exist')
        cy.get('[data-el="instance-settings"]').contains('Delete Instance').should('exist')

        // check that the user has access to the settings environment tab similarly to the team roled user
        cy.get('[data-nav="environment"]').click()
        cy.get('[data-action="import-env"]').should('exist')
        cy.get('[data-el="add-variable"]').should('exist')

        // check that the user doesn't have access to the following settings tab similarly to the team roled user (or direct access to the tabs via url
        //      Protect Instance
        //      Editor
        //      Security
        //      Palette
        //      Launcher
        //      Alerts
        cy.get('[data-el="instance-settings"] [data-nav="general"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="environment"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="high-availability"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="protect-instance"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="editor"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="security"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="palette"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="launcher"]').should('exist')
        cy.get('[data-el="instance-settings"] [data-nav="alerts"]').should('exist')
        // check direct url access as well
        const protectedRoutes = [
            { tag: 'protect-instance', check: 'Protect Instance' },
            { tag: 'high-availability', check: 'High Availability' },
            { tag: 'editor', check: '', el: 'data-el="instance-editor"' },
            { tag: 'security', check: 'HTTP Node CORS' },
            { tag: 'palette', check: '', el: 'data-el="instance-palette"' },
            { tag: 'launcher', check: 'Launcher Settings' },
            { tag: 'alerts', check: 'Email Alerts' }
        ]
        protectedRoutes.forEach(tab => {
            cy.get(`[data-nav="${tab.tag}"]`).click()
            if (tab.el) {
                // eslint-disable-next-line cypress/require-data-selectors
                cy.get(`[${tab.el}]`).should('exist')
            } else {
                cy.contains(tab.check)
            }
        })
    })
    it('should not list restricted applications when creating hosted instances', () => {
        cy.get('[data-nav="team-instances"]').click()
        cy.get('[data-action="create-project"]').should('exist')
        cy.get('[data-action="create-project"]').should('not.be.disabled')
        cy.get('[data-action="create-project"]').click()

        cy.get('[data-form="multi-step-form"]').contains('Choose an Application')

        cy.get('[data-el="application-item"]').contains('application-1').should('not.exist')
        cy.get('[data-el="application-item"]').contains('application-2').should('not.exist')
        cy.get('[data-el="application-item"]').contains('application-3').should('not.exist')
        cy.get('[data-el="application-item"]').contains('application-4').should('not.exist')
        cy.get('[data-el="application-item"]').contains('application-5').should('exist')
        cy.get('[data-el="application-item"]').contains('application-6').should('exist')

        cy.get('[data-el="application-item"]').contains('application-5').click()
        cy.get('[data-step="instance"]').should('exist')

        cy.get('[data-form="project-type"] [data-item="tile-selection-option"]').first().click()
        cy.get('[data-form="project-template"] [data-item="tile-selection-option"]').first().click()
        cy.get('[data-el="node-red-listbox"]').click()
        cy.get('[data-option="stack 1"]').click()
        cy.get('[data-el="next-step"]').click()
        cy.get('[data-step="blueprint"]').should('exist')
        cy.get('[data-el="next-step"]').should('be.enabled')
    })
    it.skip('should have dashboard role access to hosted instances belonging to restricted applications', () => {
        cy.get('[data-nav="team-instances"]').click()
        // todo instances of application to which the user has dashboard role only should also be exposed in the
        //  hosted instances list, currently they are not
    })

    // remote instances
    it('should handle direct url access of remote instances ', () => {
        const forbiddenApplicationDevice = devices.find(i => i.name === 'application-1-app-device')
        const forbiddenApplicationInstanceDevice = devices.find(i => i.name === 'application-1-instance-1-device')

        const dashboardRoleApplicationDevice = devices.find(i => i.name === 'application-2-app-device')
        const dashboardRoleApplicationInstanceDevice = devices.find(i => i.name === 'application-2-instance-1-device')

        const viewRoleApplicationDevice = devices.find(i => i.name === 'application-3-app-device')
        const viewRoleApplicationInstanceDevice = devices.find(i => i.name === 'application-3-instance-1-device')

        const memberRoleApplicationDevice = devices.find(i => i.name === 'application-4-app-device')
        const memberRoleApplicationInstanceDevice = devices.find(i => i.name === 'application-4-instance-1-device')

        const ownerRoleApplicationDevice = devices.find(i => i.name === 'application-5-app-device')
        const ownerRoleApplicationInstanceDevice = devices.find(i => i.name === 'application-5-instance-1-device')

        cy.visit(`/device/${forbiddenApplicationDevice.id}`)
        cy.get('[data-team="rbac-team"]#team-dashboard').should('exist') // redirected to home page

        cy.visit(`/device/${forbiddenApplicationInstanceDevice.id}`)
        cy.get('[data-team="rbac-team"]#team-dashboard').should('exist') // redirected to home page

        cy.visit(`/device/${dashboardRoleApplicationDevice.id}`)
        cy.get('[data-team="rbac-team"]#team-dashboard').should('exist') // redirected to home page

        cy.visit(`/device/${dashboardRoleApplicationInstanceDevice.id}`)
        cy.get('[data-team="rbac-team"]#team-dashboard').should('exist') // redirected to home page

        cy.visit(`/device/${viewRoleApplicationDevice.id}`)
        cy.get('[data-el="nav-breadcrumb"]').contains('application-3-app-device')

        cy.visit(`/device/${viewRoleApplicationInstanceDevice.id}`)
        cy.get('[data-el="nav-breadcrumb"]').contains('application-3-instance-1-device')

        cy.visit(`/device/${memberRoleApplicationDevice.id}`)
        cy.get('[data-el="nav-breadcrumb"]').contains('application-4-app-device')

        cy.visit(`/device/${memberRoleApplicationInstanceDevice.id}`)
        cy.get('[data-el="nav-breadcrumb"]').contains('application-4-instance-1-device')

        cy.visit(`/device/${ownerRoleApplicationDevice.id}`)
        cy.get('[data-el="nav-breadcrumb"]').contains('application-5-app-device')

        cy.visit(`/device/${ownerRoleApplicationInstanceDevice.id}`)
        cy.get('[data-el="nav-breadcrumb"]').contains('application-5-instance-1-device')
    })
    it('should not have restricted remote instances listed in the instances page', () => {
        cy.intercept('GET', '/api/*/teams/*/devices').as('getDevices')
        cy.get('[data-nav="team-devices"]').click()
        cy.get('[data-el="page-name"]').contains('Remote Instances')
        cy.wait('@getDevices')
        const devices = {
            'application-1-app-device': false,
            'application-1-instance-1-device': false,
            'application-2-app-device': false,
            'application-2-instance-1-device': false,
            'application-3-app-device': true,
            'application-3-instance-1-device': true,
            'application-4-app-device': true,
            'application-4-instance-1-device': true,
            'application-5-app-device': true,
            'application-5-instance-1-device': true,
            'application-6-app-device': true,
            'application-6-instance-1-device': true
        }
        cy.get('[data-el="loading"]').should('not.exist')

        Object.keys(devices).forEach((key) => {
            const condition = devices[key] ? 'exist' : 'not.exist'
            cy.get(`[data-el="row-${key}"]`).should(condition)
        })
    })
    it('should not be able to access remote instance actions belonging to applications of viewer role', () => {
        cy.intercept('GET', '/api/*/teams/1/applications').as('getApplications')
        cy.intercept('GET', '/api/*/projects/*/devices').as('getDevices')
        cy.intercept('POST', '/api/*/devices/*/logs*', {
            url: 'ws://dummy-url',
            username: 'mock-user',
            password: 'mock-password'
        }).as('getLogs')

        // the user should have a viewer role in this application
        const applicationViewerRoleApp = devices.find(i => i.name === 'application-3-app-device')

        cy.visit(`/device/${applicationViewerRoleApp.id}`)

        // check remote instance actions
        cy.get('[data-el="device-devmode-toggle"] label[disabled="true"]').should('exist')
        cy.get('[data-action="open-editor"]').should('exist').should('be.disabled')
        cy.get('[data-action="finish-setup"]').should('not.exist')

        // version history timeline
        cy.get('[data-nav="version-history"]').click()
        cy.get('[data-action="create-snapshot"]').should('not.exist')
        cy.get('[data-action="import-snapshot"]').should('not.exist')
        cy.get('[data-el="empty-state"]').contains('Nothing to see here just yet!')

        // version history snapshots
        cy.get('[data-nav="page-toggle"]').contains('Snapshots').click()
        cy.get('[data-el="row-device-snapshot-1"]').within(() => {
            cy.get('[data-el="kebab-menu"]').click()
        })
        cy.get('[data-el="kebab-item-restore-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-edit-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-view-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-compare-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-packagejson"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-delete-snapshot"]').should('have.class', 'disabled')

        // device-audit-log
        cy.get('[data-nav="device-audit-log"]').click()
        cy.get('[data-el="audit-log"]').should('exist')

        // device log
        cy.get('[data-nav="device-logs"]').click()
        cy.get('[data-hero="Node-RED Logs"]').should('exist')

        // performance
        cy.get('[data-nav="device-performance"]').click()
        cy.get('[data-hero="Remote Performance"]').should('exist')

        // settings general
        cy.get('[data-nav="device-settings"]').click()
        cy.get('[data-el="device-settings-general"]').contains('General')
        cy.get('[data-action="edit-device"]').should('not.exist')
        cy.get('[data-el="change-version"]').should('not.exist')
        cy.get('[data-el="assignment"]').contains('Assignment')

        // settings environment
        cy.get('[data-nav="environment"]').click()
        cy.get('[data-action="import-env"]').should('not.exist')
        cy.get('[data-el="add-variable"]').should('not.exist')
        cy.get('[data-el="submit"]').should('not.exist')

        const tabs = [
            'security',
            'palette',
            'danger'
        ]

        tabs.forEach(tab => {
            cy.get(`[data-nav="${tab}"]`).should('not.exist')

            cy.visit(`/device/${applicationViewerRoleApp.id}/settings/${tab}`)
            cy.get('[data-el="device-settings-general"]').should('exist')
        })
    })
    it('should not be able to access remote instance actions belonging to applications of member role', () => {
        cy.intercept('GET', '/api/*/teams/1/applications').as('getApplications')
        cy.intercept('GET', '/api/*/projects/*/devices').as('getDevices')
        cy.intercept('POST', '/api/*/devices/*/logs*', {
            url: 'ws://dummy-url',
            username: 'mock-user',
            password: 'mock-password'
        }).as('getLogs')

        // the user should have a viewer role in this application
        const applicationMemberRoleApp = devices.find(i => i.name === 'application-4-app-device')

        cy.visit(`/device/${applicationMemberRoleApp.id}`)

        // check remote instance actions
        cy.get('[data-el="device-devmode-toggle"] label[disabled="false"]').should('exist')
        cy.get('[data-action="open-editor"]').should('exist').should('be.disabled')
        cy.get('[data-action="finish-setup"]').should('not.exist')

        // version history timeline
        cy.get('[data-nav="version-history"]').click()
        cy.get('[data-action="create-snapshot"]').should('exist')
        cy.get('[data-action="import-snapshot"]').should('not.exist')
        cy.get('[data-el="empty-state"]').contains('Nothing to see here just yet!')

        // version history snapshots
        cy.get('[data-nav="page-toggle"]').contains('Snapshots').click()
        cy.get('[data-el="row-device-snapshot-1"]').within(() => {
            cy.get('[data-el="kebab-menu"]').click()
        })
        cy.get('[data-el="kebab-item-restore-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-edit-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-view-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-compare-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-packagejson"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-delete-snapshot"]').should('have.class', 'disabled')

        // device-audit-log
        cy.get('[data-nav="device-audit-log"]').click()
        cy.get('[data-el="audit-log"]').should('exist')

        // device log
        cy.get('[data-nav="device-logs"]').click()
        cy.get('[data-hero="Node-RED Logs"]').should('exist')

        // performance
        cy.get('[data-nav="device-performance"]').click()
        cy.get('[data-hero="Remote Performance"]').should('exist')

        // settings general
        cy.get('[data-nav="device-settings"]').click()
        cy.get('[data-el="device-settings-general"]').contains('General')
        cy.get('[data-action="edit-device"]').should('not.exist')
        cy.get('[data-el="change-version"]').should('not.exist')
        cy.get('[data-el="assignment"]').contains('Assignment')

        // settings environment
        cy.get('[data-nav="environment"]').click()
        cy.get('[data-action="import-env"]').should('exist')
        cy.get('[data-el="add-variable"]').should('exist')
        cy.get('[data-el="submit"]').should('exist')

        const tabs = [
            'security',
            'palette',
            'danger'
        ]

        tabs.forEach(tab => {
            cy.get(`[data-nav="${tab}"]`).should('not.exist')

            cy.visit(`/device/${applicationMemberRoleApp.id}/settings/${tab}`)
            cy.get('[data-el="device-settings-general"]').should('exist')
        })
    })
    it('should not be able to access remote instance actions belonging to applications of owner role', () => {
        cy.intercept('GET', '/api/*/teams/1/applications').as('getApplications')
        cy.intercept('GET', '/api/*/projects/*/devices').as('getDevices')
        cy.intercept('POST', '/api/*/devices/*/logs*', {
            url: 'ws://dummy-url',
            username: 'mock-user',
            password: 'mock-password'
        }).as('getLogs')

        // the user should have a viewer role in this application
        const applicationOwnerRoleApp = devices.find(i => i.name === 'application-5-app-device')

        cy.visit(`/device/${applicationOwnerRoleApp.id}`)

        // check remote instance actions
        cy.get('[data-el="device-devmode-toggle"] label[disabled="false"]').should('exist')
        cy.get('[data-action="open-editor"]').should('exist').should('be.disabled')
        cy.get('[data-action="finish-setup"]').should('exist')

        // version history timeline
        cy.get('[data-nav="version-history"]').click()
        cy.get('[data-action="create-snapshot"]').should('exist')
        cy.get('[data-action="import-snapshot"]').should('exist')
        cy.get('[data-el="empty-state"]').contains('Nothing to see here just yet!')

        // version history snapshots
        cy.get('[data-nav="page-toggle"]').contains('Snapshots').click()
        cy.get('[data-el="row-device-snapshot-1"]').within(() => {
            cy.get('[data-el="kebab-menu"]').click()
        })
        cy.get('[data-el="kebab-item-restore-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-edit-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-view-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-compare-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-packagejson"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-delete-snapshot"]').should('not.have.class', 'disabled')

        // device-audit-log
        cy.get('[data-nav="device-audit-log"]').click()
        cy.get('[data-el="audit-log"]').should('exist')

        // device log
        cy.get('[data-nav="device-logs"]').click()
        cy.get('[data-hero="Node-RED Logs"]').should('exist')

        // performance
        cy.get('[data-nav="device-performance"]').click()
        cy.get('[data-hero="Remote Performance"]').should('exist')

        // settings general
        cy.get('[data-nav="device-settings"]').click()
        cy.get('[data-el="device-settings-general"]').contains('General')
        cy.get('[data-action="edit-device"]').should('exist')
        cy.get('[data-el="change-version"]').should('exist')
        cy.get('[data-el="assignment"]').contains('Assignment')

        // settings environment
        cy.get('[data-nav="environment"]').click()
        cy.get('[data-action="import-env"]').should('exist')
        cy.get('[data-el="add-variable"]').should('exist')
        cy.get('[data-el="submit"]').should('exist')

        const tabs = {
            security: 'device-security',
            palette: 'device-palette',
            danger: 'device-danger'
        }

        Object.keys(tabs).forEach(tab => {
            cy.get(`[data-nav="${tab}"]`).should('exist')

            cy.get(`[data-nav="${tab}"]`).click()
            cy.get(`[data-el="${tabs[tab]}"]`).should('exist')
        })
    })
    it('should not list restricted applications when creating remote instances', () => {
        cy.get('[data-nav="team-devices"]').click()
        cy.get('[data-action="register-device"]').click()
        cy.get('[data-el="team-device-create-dialog"]').within(() => {
            cy.get('[data-el="dropdown"]').click()
        })
        cy.get('[data-el="listbox-options"] [data-option="application-1"]').should('not.exist')
        cy.get('[data-el="listbox-options"] [data-option="application-2"]').should('not.exist')
        cy.get('[data-el="listbox-options"] [data-option="application-3"]').should('not.exist')
        cy.get('[data-el="listbox-options"] [data-option="application-4"]').should('not.exist')
        cy.get('[data-el="listbox-options"] [data-option="application-5"]').should('exist')
        cy.get('[data-el="listbox-options"] [data-option="application-6"]').should('exist')
    })
    it('should only be able to list devices belonging to applications of which the user has access to', () => {
        cy.get('[data-nav="team-devices"]').click()

        // application-1 (none role) should be restricted
        cy.get('[data-el="row-application-1-app-device"]').should('not.exist')
        cy.get('[data-el="row-application-1-instance-1-device"]').should('not.exist')

        // application-2 (dashboard role) should only have dashboard access and devices shouldn't be present
        cy.get('[data-el="row-application-2-app-device"]').should('not.exist')
        cy.get('[data-el="row-application-2-instance-1-device"]').should('not.exist')

        // application-3 (viewer role) devices should be present but the user shouldn't be able to access device actions
        cy.get('[data-el="row-application-3-app-device"]').should('exist')
        cy.get('[data-el="row-application-3-app-device"]').within(() => {
            cy.get('[data-el="kebab-menu"]').should('not.exist')
        })
        cy.get('[data-el="row-application-3-instance-1-device"]').should('exist')
        cy.get('[data-el="row-application-3-instance-1-device"]').within(() => {
            cy.get('[data-el="kebab-menu"]').should('not.exist')
        })

        // application-4 (member role) devices should be present, and the user should not be able to access device actions
        cy.get('[data-el="row-application-4-app-device"]').should('exist')
        cy.get('[data-el="row-application-4-app-device"]').within(() => {
            cy.get('[data-el="kebab-menu"]').should('not.exist')
        })
        cy.get('[data-el="row-application-4-instance-1-device"]').should('exist')
        cy.get('[data-el="row-application-4-instance-1-device"]').within(() => {
            cy.get('[data-el="kebab-menu"]').should('not.exist')
        })

        // application-5 (owner role) devices should be present, and the user should be able to access device actions
        cy.get('[data-el="row-application-5-app-device"]').should('exist')
        cy.get('[data-el="row-application-5-app-device"]').within(() => {
            cy.get('[data-el="kebab-menu"]').should('exist')
        })
        cy.get('[data-el="row-application-5-instance-1-device"]').should('exist')
        cy.get('[data-el="row-application-5-instance-1-device"]').within(() => {
            cy.get('[data-el="kebab-menu"]').should('exist')
        })

        // application-6 should have the user's default type access (owner)
        cy.get('[data-el="row-application-6-app-device"]').should('exist')
        cy.get('[data-el="row-application-6-app-device"]').within(() => {
            cy.get('[data-el="kebab-menu"]').should('exist')
        })
        cy.get('[data-el="row-application-6-instance-1-device"]').should('exist')
        cy.get('[data-el="row-application-6-instance-1-device"]').within(() => {
            cy.get('[data-el="kebab-menu"]').should('exist')
        })
    })

    // applications
    it('should not have restricted applications listed in the applications page', () => {
        cy.get('[data-nav="team-applications"]').click()
        cy.get('[data-el="application-item"]').contains('application-1').should('not.exist')
        cy.get('[data-el="application-item"]').contains('application-2').should('not.exist')
        cy.get('[data-el="application-item"]').contains('application-3').should('exist')
        cy.get('[data-el="application-item"]').contains('application-4').should('exist')
        cy.get('[data-el="application-item"]').contains('application-5').should('exist')
        cy.get('[data-el="application-item"]').contains('application-6').should('exist')
    })
    it('should be able to create an application given his team role', () => {
        cy.intercept('DELETE', '/api/*/projects/*').as('deleteApplication')
        cy.get('[data-nav="team-applications"]').click()
        cy.get('[data-action="create-application"]').click()

        cy.get('[data-form="multi-step-form"]').should('exist')
        cy.get('[data-step="application"]').should('exist')
        cy.get('[data-form="application-name"] input').type('test-app')

        cy.get('[data-el="next-step"]').click()
        cy.get('[data-step="instance"]').should('exist')

        cy.get('[data-form="project-type"] [data-item="tile-selection-option"]').first().click()
        cy.get('[data-form="project-template"] [data-item="tile-selection-option"]').first().click()
        cy.get('[data-el="node-red-listbox"]').click()
        cy.get('[data-el="listbox-options"]').first().click()

        cy.get('[data-el="next-step"]').click()
        cy.get('[data-step="blueprint"]').should('exist')

        cy.get('[data-el="next-step"]').click()

        cy.get('[data-el="cloud-instances"] tbody tr').first().within(() => {
            cy.get('[data-el="kebab-menu"]').click()
        })
        cy.get('[data-el="kebab-options"]').contains('Delete').click()

        cy.get('[data-el="instance-name"]').invoke('text').then(value => {
            cy.get('[data-form="instance-name"] input').type(value)
        })

        cy.get('[data-el="delete-instance-dialog"]').within(() => {
            cy.get('[data-action="dialog-confirm"]').click()
        })
        cy.wait('@deleteApplication')
        cy.get('[data-nav="application-settings"]').click()

        cy.get('[data-el="application-delete"]').should('exist')
        cy.get('[data-action="delete-application"]').should('not.be.disabled')
        cy.get('[data-action="delete-application"]').click()

        cy.get('[data-el="application-name"]').invoke('text').then(value => {
            cy.get('[data-form="application-name"] input').type(value)
        })

        cy.get('[data-el="delete-application-dialog"]').within(() => {
            cy.get('[data-action="dialog-confirm"]').click()
        })

        // check redirect back to applications listing after deletion
        cy.get('[data-el="applications-list"]').should('exist')
    })
    it('should not have direct access to an application when accessing via url', () => {
        const forbiddenApplications = [
            'application-1',
            'application-2'
        ]

        applications.forEach(app => {
            cy.visit(`/team/${team.slug}/applications/${app.id}`)
            if (forbiddenApplications.includes(app.name)) {
                cy.get('[data-page="not-found"]').should('exist')
            } else {
                cy.get('[data-el="page-name"]').contains(app.name)
            }
        })
    })
    it('should not be able to access application actions of applications he has viewer role', () => {
        const application = applications.find(i => i.name === 'application-3')
        cy.get('[data-nav="team-applications"]').click()

        cy.get('[data-el="application-item"]').contains(application.name).click()

        // application instances
        cy.get('[data-el="row-application-3-instance-1"]').should('exist')
        cy.get('[data-action="open-editor"]').should('exist')
        cy.get('[data-action="open-dashboard"]').should('exist')

        // application devices
        cy.get('[data-nav="application-devices-overview"]').click()
        cy.get('[data-el="row-application-3-app-device"]').should('exist')
        cy.get('[data-el="row-application-3-app-device"]').contains('Finish Setup').should('not.exist')
        cy.get('[data-el="row-application-3-instance-1-device-1"]').should('not.exist')

        // application device groups
        cy.get('[data-nav="application-devices-groups-overview"]').should('not.exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/device-groups`)
        cy.get('[data-el="device-group-list"]').should('not.exist')

        // application snapshots
        cy.get('[data-nav="application-snapshots"]').click()
        cy.get('[data-el="application-snapshots"]').should('exist')
        cy.get('[data-el="snapshots"] tbody tr').should('have.length', 2)
        cy.get('[data-el="snapshots"] tbody').within(() => {
            cy.get('[data-el="row-snapshot-1"]').should('exist')
            cy.get('[data-el="row-snapshot-1"]').within(() => {
                cy.get('[data-el="kebab-menu"]').click()
            })
        })
        cy.get('[data-el="kebab-item-edit-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-view-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-compare-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-packagejson"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-delete-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="snapshots"] tbody').within(() => {
            cy.get('[data-el="row-device-snapshot-1"]').should('exist')
            cy.get('[data-el="row-device-snapshot-1"]').within(() => {
                cy.get('[data-el="kebab-menu"]').click()
            })
        })
        cy.get('[data-el="row-device-snapshot-1"]').should('exist')
        cy.get('[data-el="row-device-snapshot-1"]').within(() => {
            cy.get('[data-el="kebab-menu"]').click()
        })
        cy.get('[data-el="kebab-item-edit-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-view-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-compare-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-packagejson"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-delete-snapshot"]').should('have.class', 'disabled')

        // application pipelines
        cy.get('[data-nav="application-pipelines"]').should('not.exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/pipelines`)
        cy.get('[data-el="application-pipelines"]').should('not.exist')

        // application logs
        cy.get('[data-nav="application-logs"]').click()
        cy.get('[data-hero="Node-RED Logs"]').should('exist')

        // application audit log
        cy.get('[data-nav="application-activity"]').should('not.exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/activity`)
        cy.get('[data-el="audit-log"]').should('not.exist')

        // application dependencies
        cy.get('[data-nav="application-dependencies"]').should('not.exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/dependencies`)
        cy.get('[data-el="application-dependencies"]').should('not.exist')

        // application settings
        cy.get('[data-nav="application-settings"]').should('exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/settings`)
        cy.get('[data-el="application-settings"]').should('exist')
        cy.get('[data-el="application-summary"]').should('exist')
        cy.get('[data-el="application-edit"]').should('not.exist')
        cy.get('[data-el="application-delete"]').should('not.exist')

        // application settings user-access
        cy.get('[data-nav="user-access"]').should('not.exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/settings/user-access`)
        cy.get('[data-el="application-summary"]').should('exist')
    })
    it('should be able to access application actions of applications he has member role', () => {
        const application = applications.find(i => i.name === 'application-4')
        cy.get('[data-nav="team-applications"]').click()

        cy.get('[data-el="application-item"]').contains(application.name).click()

        // application instances
        cy.get('[data-el="row-application-4-instance-1"]').should('exist')
        cy.get('[data-action="open-editor"]').should('exist')
        cy.get('[data-action="open-dashboard"]').should('exist')

        // application devices
        cy.get('[data-nav="application-devices-overview"]').click()
        cy.get('[data-el="row-application-4-app-device"]').should('exist')
        cy.get('[data-el="row-application-4-app-device"]').contains('Finish Setup').should('not.exist')
        cy.get('[data-el="row-application-4-instance-1-device-1"]').should('not.exist')

        // application device groups
        cy.get('[data-nav="application-devices-groups-overview"]').click()
        cy.get('[data-el="loading"]').should('not.exist')
        cy.get('[data-action="create-device-group"]').should('be.disabled')
        cy.get('[data-el="row-application-4-group-1"]').should('exist')
        cy.get('[data-el="row-application-4-group-1"]').click()
        cy.get('[data-el="device-group-devices"]').should('exist')
        cy.get('[data-el="device-group-members"]').should('exist')
        cy.get('[data-action="edit-device-group"]').should('be.disabled')
        cy.get('[data-nav="application-device-group-settings"]').click()
        cy.get('[data-el="device-group-settings-general"]').should('exist')
        cy.get('[data-action="save-general-settings"]').should('not.exist')
        cy.get('[data-el="target-snapshot"]').should('not.exist')
        cy.get('[data-el="delete-device-group"]').should('not.exist')
        cy.get('[data-nav="environment"]').click()
        cy.get('[data-form="device-group-settings-env"]').should('exist')
        cy.get('[data-action="save-env-settings"]').should('not.exist')
        cy.get('[data-action="import-env"]').should('not.exist')
        cy.get('[data-el="add-variable"]').should('not.exist')

        cy.get('[data-el="nav-breadcrumb"]').contains(application.name).click()

        // application snapshots
        cy.get('[data-nav="application-snapshots"]').click()
        cy.get('[data-el="application-snapshots"]').should('exist')
        cy.get('[data-el="snapshots"] tbody tr').should('have.length', 2)
        cy.get('[data-el="snapshots"] tbody').within(() => {
            cy.get('[data-el="row-snapshot-1"]').should('exist')
            cy.get('[data-el="row-snapshot-1"]').within(() => {
                cy.get('[data-el="kebab-menu"]').click()
            })
        })
        cy.get('[data-el="kebab-item-edit-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-view-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-compare-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-packagejson"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-delete-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="snapshots"] tbody').within(() => {
            cy.get('[data-el="row-device-snapshot-1"]').should('exist')
            cy.get('[data-el="row-device-snapshot-1"]').within(() => {
                cy.get('[data-el="kebab-menu"]').click()
            })
        })
        cy.get('[data-el="row-device-snapshot-1"]').should('exist')
        cy.get('[data-el="row-device-snapshot-1"]').within(() => {
            cy.get('[data-el="kebab-menu"]').click()
        })
        cy.get('[data-el="kebab-item-edit-snapshot"]').should('have.class', 'disabled')
        cy.get('[data-el="kebab-item-view-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-compare-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-packagejson"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-delete-snapshot"]').should('have.class', 'disabled')

        // application pipelines
        cy.get('[data-nav="application-pipelines"]').click()
        cy.get('[data-action="pipeline-add"]').should('not.exist')
        cy.get('[data-el="pipelines-list"]').should('exist')
        cy.get('[data-pipeline="application-4-pipeline"]').should('exist')
        cy.get('[data-stage="application-4-stage-1"]').within(() => {
            cy.get('[data-action="stage-edit"]').should('not.exist')
            cy.get('[data-action="stage-delete"]').should('not.exist')
            cy.get('[data-action="stage-run"]').should('not.exist')
        })
        cy.get('[data-stage="application-4-stage-2"]').within(() => {
            cy.get('[data-action="stage-edit"]').should('not.exist')
            cy.get('[data-action="stage-delete"]').should('not.exist')
            cy.get('[data-action="stage-run"]').should('not.exist')
        })
        cy.get('[data-action="add-stage"]').should('not.exist')

        // application logs
        cy.get('[data-nav="application-logs"]').click()
        cy.get('[data-hero="Node-RED Logs"]').should('exist')

        // application audit log
        cy.get('[data-nav="application-activity"]').should('not.exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/activity`)
        cy.get('[data-el="audit-log"]').should('not.exist')

        // application dependencies
        cy.get('[data-nav="application-dependencies"]').should('not.exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/dependencies`)
        cy.get('[data-el="application-dependencies"]').should('not.exist')

        // application settings
        cy.get('[data-nav="application-settings"]').should('exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/settings`)
        cy.get('[data-el="application-settings"]').should('exist')
        cy.get('[data-el="application-summary"]').should('exist')
        cy.get('[data-el="application-edit"]').should('not.exist')
        cy.get('[data-el="application-delete"]').should('not.exist')

        // application settings user-access
        cy.get('[data-nav="user-access"]').should('not.exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/settings/user-access`)
        cy.get('[data-el="application-summary"]').should('exist')
    })
    it('should be able to access application actions of applications he has owner role', () => {
        // the user should have an owner role in this application
        const application = applications.find(i => i.name === 'application-5')
        cy.get('[data-nav="team-applications"]').click()

        cy.get('[data-el="application-item"]').contains(application.name).click()

        // application instances
        cy.get('[data-el="row-application-5-instance-1"]').should('exist')
        cy.get('[data-action="open-editor"]').should('exist')
        cy.get('[data-action="open-dashboard"]').should('exist')

        // application devices
        cy.get('[data-nav="application-devices-overview"]').click()
        cy.get('[data-el="row-application-5-app-device"]').should('exist')
        cy.get('[data-el="row-application-5-app-device"]').contains('Finish Setup').should('exist')
        cy.get('[data-el="row-application-5-instance-1-device-1"]').should('not.exist')

        // application device groups
        cy.get('[data-nav="application-devices-groups-overview"]').click()
        cy.get('[data-el="loading"]').should('not.exist')
        cy.get('[data-action="create-device-group"]').should('not.be.disabled')
        cy.get('[data-el="row-application-5-group-1"]').should('exist')
        cy.get('[data-el="row-application-5-group-1"]').click()
        cy.get('[data-el="device-group-devices"]').should('exist')
        cy.get('[data-el="device-group-members"]').should('exist')
        cy.get('[data-action="edit-device-group"]').should('not.be.disabled')
        cy.get('[data-nav="application-device-group-settings"]').click()
        cy.get('[data-el="device-group-settings-general"]').should('exist')
        cy.get('[data-action="save-general-settings"]').should('exist')
        cy.get('[data-el="target-snapshot"]').should('exist')
        cy.get('[data-el="delete-device-group"]').should('exist')
        cy.get('[data-nav="environment"]').click()
        cy.get('[data-form="device-group-settings-env"]').should('exist')
        cy.get('[data-action="save-env-settings"]').should('exist')
        cy.get('[data-action="import-env"]').should('exist')
        cy.get('[data-el="add-variable"]').should('exist')

        cy.get('[data-el="nav-breadcrumb"]').contains(application.name).click()

        // application snapshots
        cy.get('[data-nav="application-snapshots"]').click()
        cy.get('[data-el="application-snapshots"]').should('exist')
        cy.get('[data-el="snapshots"] tbody tr').should('have.length', 2)
        cy.get('[data-el="snapshots"] tbody').within(() => {
            cy.get('[data-el="row-snapshot-1"]').should('exist')
            cy.get('[data-el="row-snapshot-1"]').within(() => {
                cy.get('[data-el="kebab-menu"]').click()
            })
        })
        cy.get('[data-el="kebab-item-edit-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-view-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-compare-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-packagejson"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-delete-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="snapshots"] tbody').within(() => {
            cy.get('[data-el="row-device-snapshot-1"]').should('exist')
            cy.get('[data-el="row-device-snapshot-1"]').within(() => {
                cy.get('[data-el="kebab-menu"]').click()
            })
        })
        cy.get('[data-el="row-device-snapshot-1"]').should('exist')
        cy.get('[data-el="row-device-snapshot-1"]').within(() => {
            cy.get('[data-el="kebab-menu"]').click()
        })
        cy.get('[data-el="kebab-item-edit-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-view-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-compare-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-snapshot"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-download-packagejson"]').should('not.have.class', 'disabled')
        cy.get('[data-el="kebab-item-delete-snapshot"]').should('not.have.class', 'disabled')

        // application pipelines
        cy.get('[data-nav="application-pipelines"]').click()
        cy.get('[data-action="pipeline-add"]').should('exist')
        cy.get('[data-el="pipelines-list"]').should('exist')
        cy.get('[data-pipeline="application-5-pipeline"]').should('exist')
        cy.get('[data-stage="application-5-stage-1"]').within(() => {
            cy.get('[data-action="stage-edit"]').should('exist')
            cy.get('[data-action="stage-delete"]').should('exist')
            cy.get('[data-action="stage-run"]').should('exist')
        })
        cy.get('[data-stage="application-5-stage-2"]').within(() => {
            cy.get('[data-action="stage-edit"]').should('exist')
            cy.get('[data-action="stage-delete"]').should('exist')
            cy.get('[data-action="stage-run"]').should('exist')
        })
        cy.get('[data-action="add-stage"]').should('exist')

        // application logs
        cy.get('[data-nav="application-logs"]').click()
        cy.get('[data-hero="Node-RED Logs"]').should('exist')

        // application audit log
        cy.get('[data-nav="application-activity"]').should('exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/activity`)
        cy.get('[data-el="audit-log"]').should('not.exist')

        // application dependencies
        cy.get('[data-nav="application-dependencies"]').should('exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/dependencies`)
        cy.get('[data-el="application-dependencies"]').should('exist')

        // application settings
        cy.get('[data-nav="application-settings"]').should('exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/settings`)
        cy.get('[data-el="application-settings"]').should('exist')
        cy.get('[data-el="application-summary"]').should('exist')
        cy.get('[data-el="application-edit"]').should('exist')
        cy.get('[data-el="application-delete"]').should('exist')

        // application settings user-access
        cy.get('[data-nav="user-access"]').should('exist')
        cy.visit(`/team/${team.slug}/applications/${application.id}/settings/user-access`)
        cy.get('[data-el="application-user-access"]').should('exist')
    })

    // groups
    it('should not have restricted applications in the team create group dialog', () => {
        cy.get('[data-nav="device-groups"]').click()
        cy.get('[data-action="create-device-group"]').click()
        cy.get('[data-el="applications-list"]').click()
        cy.get('[data-option="application-1"]').should('not.exist') // restricted role
        cy.get('[data-option="application-2"]').should('not.exist') // dashboard role
        cy.get('[data-option="application-3"]').should('not.exist') // viewer role
        cy.get('[data-option="application-4"]').should('not.exist') // member role
        cy.get('[data-option="application-5"]').should('exist') // owner role
        cy.get('[data-option="application-6"]').should('exist') // default role
    })
    it('should not have restricted groups listed in the groups page', () => {
        cy.get('[data-nav="device-groups"]').click()
        cy.get('[data-el=device-groups-table]').within(() => {
            cy.get('[data-el="row-application-1-group-1"]').should('not.exist')
            cy.get('[data-el="row-application-2-group-1"]').should('not.exist')
            cy.get('[data-el="row-application-3-group-1"]').should('exist')
            cy.get('[data-el="row-application-4-group-1"]').should('exist')
            cy.get('[data-el="row-application-5-group-1"]').should('exist')
            cy.get('[data-el="row-application-6-group-1"]').should('exist')
        })
    })

    // pipelines
    it('should not have direct access to a pipeline belonging to a restricted application when accessing via url', () => {
        cy.get('[data-nav="team-pipelines"]').click()
        cy.get('[data-pipeline="application-1-pipeline"]').should('not.exist')
        cy.get('[data-pipeline="application-2-pipeline"]').should('not.exist')
        cy.get('[data-pipeline="application-3-pipeline"]').should('exist')
        cy.get('[data-pipeline="application-3-pipeline"]').within(() => {
            cy.get('[data-stage="application-3-stage-1"]')
            cy.get('[data-stage="application-3-stage-2"]')
        })
        cy.get('[data-pipeline="application-4-pipeline"]').should('exist')
        cy.get('[data-pipeline="application-4-pipeline"]').within(() => {
            cy.get('[data-stage="application-4-stage-1"]')
            cy.get('[data-stage="application-4-stage-2"]')
        })
        cy.get('[data-pipeline="application-5-pipeline"]').should('exist')
        cy.get('[data-pipeline="application-5-pipeline"]').within(() => {
            cy.get('[data-stage="application-5-stage-1"]')
            cy.get('[data-stage="application-5-stage-2"]')
        })
        cy.get('[data-pipeline="application-6-pipeline"]').should('exist')
        cy.get('[data-pipeline="application-6-pipeline"]').within(() => {
            cy.get('[data-stage="application-6-stage-1"]')
            cy.get('[data-stage="application-6-stage-2"]')
        })
    })

    // bill of materials
    it('should not have instances belonging to restricted applications listed in the bill of materials page', () => {
        cy.get('[data-nav="team-bom"]').click()

        // open all dependency items and version lists
        cy.get('[data-el="dependency-item"]').click({ multiple: true })
        cy.get('[data-el="versions-list"]').click({ multiple: true })

        const restrictedInstances = ['application-1-instance-1', 'application-2-instance-1']
        instances.forEach(instance => {
            cy.get(`[data-item="${instance.name}"]`).should(restrictedInstances.includes(instance.name) ? 'not.exist' : 'exist')
        })

        const restrictedDevices = [
            'application-1-app-device',
            'application-1-instance-1-device',
            'application-2-app-device',
            'application-2-instance-1-device'
        ]
        devices.forEach(device => {
            cy.get(`[data-item="${device.name}"]`).should(restrictedDevices.includes(device.name) ? 'not.exist' : 'exist')
        })
    })

    // brokers
    it('should not have access to ff-broker clients created by instances belonging to restricted applications', () => {
        cy.get('[data-nav="team-brokers"]').click()
        cy.get('[data-nav="team-brokers-clients"]').click()

        cy.get('[data-client="application-1-instance-1"]').should('not.exist')
        cy.get('[data-client="application-1-app-device"]').should('not.exist')
        cy.get('[data-client="application-1-instance-1-device"]').should('not.exist')

        cy.get('[data-client="application-2-instance-1"]').should('not.exist')
        cy.get('[data-client="application-2-app-device"]').should('not.exist')
        cy.get('[data-client="application-2-instance-1-device"]').should('not.exist')

        cy.get('[data-client="application-3-instance-1"]').should('not.exist')
        cy.get('[data-client="application-3-app-device"]').should('not.exist')
        cy.get('[data-client="application-3-instance-1-device"]').should('not.exist')

        cy.get('[data-client="application-4-instance-1"]').should('exist')
        cy.get('[data-client="application-4-app-device"]').should('exist')
        cy.get('[data-client="application-4-instance-1-device"]').should('exist')

        cy.get('[data-client="application-5-instance-1"]').should('exist')
        cy.get('[data-client="application-5-app-device"]').should('exist')
        cy.get('[data-client="application-5-instance-1-device"]').should('exist')

        cy.get('[data-client="application-6-instance-1"]').should('exist')
        cy.get('[data-client="application-6-app-device"]').should('exist')
        cy.get('[data-client="application-6-instance-1-device"]').should('exist')
    })

    // performance
    it('should not have access to instances and their performance data belonging to restricted applications', () => {
        cy.get('[data-nav="team-performance"]').click()
        cy.get('[data-el="loading"]').should('not.exist')
        const restrictedInstances = ['application-1-instance-1', 'application-2-instance-1']
        instances.forEach(instance => {
            cy.get(`[data-el="row-${instance.name}"]`).should(restrictedInstances.includes(instance.name) ? 'not.exist' : 'exist')
        })
    })
})
