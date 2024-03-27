// test admin rights & access in FlowForge

describe('FlowFuse platform admin users', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('can login in', () => {
        cy.url().should('include', '/applications')
    })

    it('can view (and click) the "Admin Settings" in user options', () => {
        cy.get('[data-cy="user-options"]').get('.ff-dropdown-options').should('not.be.visible')
        cy.get('[data-cy="user-options"]').click()
        cy.get('[data-cy="user-options"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-cy="user-options"] .ff-dropdown-options > .ff-dropdown-option').eq(2).contains('Admin Settings').should('be.visible')
        cy.get('[data-cy="user-options"] .ff-dropdown-options > .ff-dropdown-option').eq(2).click()

        // wait for APIs to return
        cy.wait('@getSettings')
        cy.wait('@getAdminStats')
        cy.wait('@getAdminLicense')

        cy.url().should('include', '/admin/overview')
    })

    it('can navigate to Admin Settings directly', () => {
        cy.visit('/admin/overview')
        cy.url().should('include', '/admin/overview')
    })

    it('can set license', () => {
        cy.visit('/admin/overview')
        cy.url().should('include', '/admin/overview')

        cy.get('#platform-sidenav [data-nav="admin-settings"]').click()

        cy.get('[data-nav="section-license"]').click()

        cy.get('[data-form="update-licence"]').click()

        // Update
        cy.focused().parents('[data-form="license"]').should('exist')
        cy.get('[data-form="license"] input').type('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg', { delay: 1 })
        cy.get('[data-form="check-license"]').click()

        // Check details
        cy.get('[data-form="submit"]').click()

        // Back to license screen
        cy.get('[data-el="license-details"]').should('exist')
    })

    it("can view applications and instances from teams they're not a member of", () => {
        cy.intercept('GET', '/api/*/projects/*').as('getInstance')
        cy.intercept('GET', '/api/*/applications/*').as('getApplication')
        cy.intercept('GET', '/api/*/applications/*/instances').as('getApplicationInstances')

        cy.visit('/admin/overview')

        cy.get('[data-nav="admin-teams"]').click()
        cy.wait('@getTeams')

        // Not a member of BTeam
        cy.get('[data-el="teams-table"]').contains('BTeam').click()
        cy.wait('@getTeamApplications')

        cy.get('[data-el="banner-team-as-admin"]').should('exist')

        cy.get('[data-action="view-application"]').contains('application-2').click()

        cy.wait('@getApplication')
        cy.wait('@getApplicationInstances')

        cy.get('[data-el="banner-project-as-admin"]').should('exist')
        cy.get('[data-action="open-editor"]').should('be.disabled')

        cy.get('[data-el="cloud-instances"] tr').contains('instance-2-1').click()

        cy.wait('@getInstance')

        cy.get('[data-el="banner-project-as-admin"]').should('exist')
    })

    it("can view devices from teams they're not a member of", () => {
        cy.intercept('GET', '/api/*/projects/*').as('getProject')
        cy.intercept('GET', '/api/*/teams/*/devices').as('getDevices')
        cy.intercept('GET', '/api/*/devices/*').as('getDevice')

        cy.visit('/admin/overview')

        cy.get('[data-nav="admin-teams"]').click()
        cy.wait('@getTeams')

        // Not a member of BTeam
        cy.get('[data-el="teams-table"]').contains('BTeam').click()
        cy.wait('@getTeamApplications')

        cy.get('[data-nav="team-devices"]').click()
        cy.wait('@getDevices')

        cy.get('[data-el="devices-browser"]').contains('team2-unassigned-device').click()
        cy.wait('@getDevice')

        cy.get('[data-el="banner-device-as-admin"]').should('exist')
    })

    it('can enable sign up', () => {
        cy.intercept('GET', '/api/*/settings').as('getSettings')
        cy.intercept('POST', '/account/logout').as('logout')

        cy.visit('/admin/settings/general')
        cy.wait('@getSettings')

        // enable sign up
        cy.get('[data-el="enable-signup"] [data-el="form-row-title"]').click()

        cy.get('[data-action="save-settings"]').click()

        cy.logout()

        cy.visit('/')

        cy.get('[data-action="sign-up"]').click()

        cy.url().should('include', '/account/create')

        cy.get('[data-el="banner-text"]').should('not.exist')
        cy.get('[data-el="splash"]').should('not.exist')
    })

    it('can customise the content of the "Sign Up" screen', () => {
        cy.intercept('GET', '/api/*/settings').as('getSettings')

        cy.visit('/admin/settings/general')
        cy.wait('@getSettings')

        cy.get('[data-el="banner"]').type('this is banner')
        cy.get('[data-el="splash"]').type('<h1>Welcome to FlowForge</h1>')

        cy.get('[data-action="save-settings"]').click()

        cy.logout()

        cy.visit('/')

        cy.get('[data-action="sign-up"]').click()

        cy.url().should('include', '/account/create')

        cy.get('[data-el="banner-text"]').contains('this is banner')
        cy.get('[data-el="splash"]').contains('Welcome to FlowForge')
    })
})

describe('FlowFuse platform non-admin users', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('can login in', () => {
        cy.url().should('include', '/applications')
    })

    it('cannot view the "Admin Settings" in user options', () => {
        cy.get('[data-cy="user-options"]').get('.ff-dropdown-options').should('not.be.visible')
        cy.get('[data-cy="user-options"]').click()
        cy.get('[data-cy="user-options"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-cy="user-options"] .ff-dropdown-options > .ff-dropdown-option').eq(1).contains('Admin Settings').should('not.exist')
        cy.url().should('not.include', '/admin/overview')
    })

    it('cannot navigate to Admin Settings directly, and should be redirected', () => {
        cy.visit('/admin/overview')
        cy.url().should('not.include', '/admin/overview')
    })
})

describe('FlowForge stores an admin-level audit', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/audit-log')
    })

    it('when a user logs in', () => {
        cy.get('.ff-audit-entry').contains('User Logged In')
    })

    it('when a platform license key is applied', () => {
        cy.get('.ff-audit-entry').contains('License Applied')
    })
})
