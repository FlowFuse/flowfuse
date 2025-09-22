describe('FlowFuse - RBAC Contextual permissions', () => {
    let team
    let instances
    let devices
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
            .then(() => cy.logout())
    })
    // describe('template', () => {
    //     // dashboard
    //     it('should not have restricted remote instances listed on the dashboard page', () => {})
    //     it('should not have restricted hosted instances listed on the dashboard page', () => {})
    //     it('should not have recent activity items pertaining restricted instances on the dashboard page', () => {})
    //
    //     // hosted instances
    //     it('should not have direct access to a hosted instance when accessing via url', () => {})
    //     it('should not have restricted hosted instances listed in the instances page', () => {})
    //     it('should not be able to access hosted instance actions belonging to applications of lesser role', () => {})
    //     it('should not allow users with lesser roles than the team role to make changes to the instance', () => {})
    //     it('should allow users with greater roles than the team role to make changes to the hosted instance', () => {})
    //     it('should not list restricted applications when creating hosted instances', () => {})
    //     it('should have member role access to hosted instances belonging to restricted applications', () => {})
    //     it('should have viewer role access to hosted instances belonging to restricted applications', () => {})
    //     it('should have dashboard role access to hosted instances belonging to restricted applications', () => {})
    //
    //     // remote instances
    //     it('should not have direct access to a remote instance when accessing via url', () => {})
    //     it('should not have restricted remote instances listed in the instances page', () => {})
    //     it('should not be able to access remote instance actions belonging to applications of lesser role', () => {})
    //     it('should not allow users with lesser roles than the team role to make changes to the instance', () => {})
    //     it('should allow users with greater roles than the team role to make changes to the remote instance', () => {})
    //     it('should not list restricted applications when creating remote instances', () => {})
    //     it('should have member role access to remote instances belonging to restricted applications', () => {})
    //     it('should have viewer role access to remote instances belonging to restricted applications', () => {})
    //
    //     // applications
    //     it('should not have direct access to an application when accessing via url', () => {})
    //     it('should not have restricted applications listed in the applications page', () => {})
    //     it('should not allow users with lesser roles than the team role to make changes to the application', () => {})
    //     it('should not allow users with greater roles than the team role to make changes to the application', () => {})
    //
    //     // groups
    //     it('should not have direct access to a group when accessing via url', () => {})
    //     it('should not have restricted groups listed in the groups page', () => {})
    //
    //     // pipelines
    //     it('should not have direct access to a pipeline belonging to a restricted application when accessing via url', () => {})
    //     it('should not have restricted pipelines belonging to a restricted application listed in the pipelines page', () => {})
    //
    //     // bill of materials
    //     it('should not have instances belonging to restricted applications listed in the bill of materials page', () => {})
    //
    //     // brokers
    //     it('should not have access to ff-broker clients created by instances belonging to restricted applications', () => {})
    //
    //     // performance
    //     it('should not have access to instances and their performance data belonging to restricted applications', () => {})
    // })

    describe('Team Owners', () => {
        beforeEach(() => {
            cy.login('ownerOwen', 'ooPassword')
            cy.home()
        })

        // dashboard
        it('should not have restricted remote instances listed on the dashboard page', () => {
            cy.get('[data-el="dashboard-section-hosted"]').within(() => {
                // todo: this test is failing because the dashboard is not loading properly
                // out of 6 teams with 1 instance each, one team has restricted role, for another viewer role
                // resulting in 4 running, 0 error, 0 stopped
                // should display 3 instance tiles
                // should display has more with one more available

                // cy.get('[data-state="running"]').contains('4')
                cy.get('[data-state="error"]').contains('0')
                cy.get('[data-state="stopped"]').contains('0')
                // cy.get('[data-el="instance-tile"]').should('have.length', 3)
                // cy.get('[data-el="has-more"]').contains('Show 1 more')
            })
            cy.get('[data-el="dashboard-section-remote"]').within(() => {
                // todo: this test is failing because the dashboard is not loading properly
                // out of 6 teams with 2 instances each, one team has restricted role, for another viewer role
                // resulting in 0 running, 0 error, 8 stopped
                // should display 3 instance tiles
                // should display has more with one more available

                cy.get('[data-state="running"]').contains('0')
                cy.get('[data-state="error"]').contains('0')
                // cy.get('[data-state="stopped"]').contains('8')
                // cy.get('[data-el="device-tile"]').should('have.length', 3)
                // cy.get('[data-el="has-more"]').contains('Show 5 more')
            })
        })
        it('should not have restricted hosted instances listed on the dashboard page', () => {
            cy.get('[data-el="dashboard-section-hosted"]').within(() => {
                cy.get('[data-el="instance-tile"]').contains('application-1-instance-1').should('not.exist')
                cy.get('[data-el="instance-tile"]').contains('application-2-instance-1').should('not.exist')
            })

            cy.get('[data-el="dashboard-section-remote"]').within(() => {
                // todo: this test is failing because remote instances belonging to restricted applications are loaded
                // cy.get('[data-el="device-tile"]').contains('application-1-instance-1-device').should('not.exist')
                // cy.get('[data-el="device-tile"]').contains('application-2-instance-1-device').should('not.exist')
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
                cy.get('[data-el="row-application-4-instance-1"] [data-el="kebab-menu"]').should('exist')

                // the user has his team role in this application
                cy.get('[data-el="row-application-6-instance-1"]').should('exist')
                cy.get('[data-el="row-application-4-instance-1"] [data-el="kebab-menu"]').should('exist')
            })
        })
        it.only('should not be able to access hosted instance actions belonging to applications of lesser role', () => {
            // the user should have a viewer role in this application
            const application3Instance1 = instances.find(i => i.name === 'application-3-instance-1')
            // the user should have a member role in this application
            const application4Instance1 = instances.find(i => i.name === 'application-4-instance-1')
            // the user should have his own role in this application
            const application5Instance1 = instances.find(i => i.name === 'application-5-instance-1')

            cy.visit(`/instance/${application4Instance1.id}`)
            cy.get('[data-el="action-button"]').should('not.exist')
            cy.get('[data-action="open-editor"]').should('exist').should('not.be.disabled')
            cy.get('[data-action="open-dashboard"]').should('exist').should('not.be.disabled')
            // check instance home page for recent activity section being present

            // go to devices page
            //      check that the user can't add a device
            //      check that the user can't edit a device
            //      check the user can't select devices)

            // go to version history page
            //      check that the user sees the version history
            //      check that the user can download package.json but can't access any other action items on hostory items

            // go to version history snapshots page
            //      check that the user sees snapshots'
            //      check that the user can download package json
            //      check that the user can't access any other action items on snapshots

            // check that the user doesn't have access to the assets tab similarly to the team roled user

            // check that the user has access to the audit log tab similarly to the team roled user
            //      check that the user has access to the audit log

            // check that the user has access to the logs tab similarly to the team roled user
            //      check that the user has access to the logs

            // check that the user has access to the performance tab similarly to the team roled user
            //      check that the user has access to the performance metrics

            // check that the user has access to the settings tab similarly to the team roled user
            //      check that the user has access to the general instance details & hosting section
            //      check that the user doesn't have access to the other general details

            // check that the user has access to the settings environment tab similarly to the team roled user
            //      check that the user can't change/add/remove/import environment variables

            // check that the user doesn't have access to the following settings tab similarly to the team roled user (or direct access to the tabs via url
            //      Protect Instance
            //      Editor
            //      Security
            //      Palette
            //      Launcher
            //      Alerts

            // repeat checks for application4Instance1 & application5Instance1
        })
        it('should not allow users with lesser roles than the team role to make changes to the instance', () => {})
        it('should allow users with greater roles than the team role to make changes to the hosted instance', () => {})
        it('should not list restricted applications when creating hosted instances', () => {})
        it('should have member role access to hosted instances belonging to restricted applications', () => {})
        it('should have viewer role access to hosted instances belonging to restricted applications', () => {})
        it('should have dashboard role access to hosted instances belonging to restricted applications', () => {})

        // remote instances
        it('should not have direct access to a remote instance when accessing via url', () => {})
        it('should not have restricted remote instances listed in the instances page', () => {})
        it('should not be able to access remote instance actions belonging to applications of lesser role', () => {})
        it('should not allow users with lesser roles than the team role to make changes to the instance', () => {})
        it('should allow users with greater roles than the team role to make changes to the hosted instance', () => {})
        it('should not list restricted applications when creating remote instances', () => {})
        it('should have member role access to remote instances belonging to restricted applications', () => {})
        it('should have viewer role access to remote instances belonging to restricted applications', () => {})

        // applications
        it('should not have direct access to an application when accessing via url', () => {})
        it('should not have restricted applications listed in the applications page', () => {})
        it('should not allow users with lesser roles than the team role to make changes to the application', () => {})
        it('should not allow users with greater roles than the team role to make changes to the application', () => {})

        // groups
        it('should not have direct access to a group when accessing via url', () => {})
        it('should not have restricted groups listed in the groups page', () => {})

        // pipelines
        it('should not have direct access to a pipeline belonging to a restricted application when accessing via url', () => {})
        it('should not have restricted pipelines belonging to a restricted application listed in the pipelines page', () => {})

        // bill of materials
        it('should not have instances belonging to restricted applications listed in the bill of materials page', () => {})

        // brokers
        it('should not have access to ff-broker clients created by instances belonging to restricted applications', () => {})

        // performance
        it('should not have access to instances and their performance data belonging to restricted applications', () => {})
    })
})
