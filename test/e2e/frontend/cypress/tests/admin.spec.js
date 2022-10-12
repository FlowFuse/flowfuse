// test admin rights & access in FlowForge

describe('FlowForge platform admin users', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
    })

    it('can login in', () => {
        cy.url().should('include', '/overview')
    })

    it('can view (and click) the "Admin Settings" in user options', () => {
        cy.get('[data-cy="user-options"]').get('.ff-dropdown-options').should('not.exist')
        cy.get('[data-cy="user-options"]').click()
        cy.get('[data-cy="user-options"] .ff-dropdown-options').should('be.visible')
        cy.get('[data-cy="user-options"] .ff-dropdown-options > .ff-dropdown-option').eq(1).contains('Admin Settings').should('be.visible')
        cy.get('[data-cy="user-options"] .ff-dropdown-options > .ff-dropdown-option').eq(1).click()

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

    it('can view projects from teams they\'re not a member of', () => {
        cy.intercept('GET', '/api/*/projects/*').as('getProject')

        cy.visit('/admin/overview')

        cy.get('[data-nav="admin-teams"]').click()
        cy.wait('@getTeams')

        // Not a member of BTeam
        cy.get('[data-el="teams-table"]').contains('BTeam').click()
        cy.wait('@getTeamProjects')

        cy.get('[data-el="banner-team-as-admin"]').should('exist')

        cy.get('[data-action="view-project"]').contains('project2').click()

        cy.wait('@getProject')

        cy.get('[data-el="banner-project-as-admin"]').should('exist')

        cy.get('[data-action="open-editor"]').should('not.exist')
        cy.get('[data-el="editor-link"]').should('not.exist')
    })

    it('can view devices from teams they\'re not a member of', () => {
        cy.intercept('GET', '/api/*/projects/*').as('getProject')
        cy.intercept('GET', '/api/*/teams/*/devices').as('getDevices')
        cy.intercept('GET', '/api/*/devices/*').as('getDevice')

        cy.visit('/admin/overview')

        cy.get('[data-nav="admin-teams"]').click()
        cy.wait('@getTeams')

        // Not a member of BTeam
        cy.get('[data-el="teams-table"]').contains('BTeam').click()
        cy.wait('@getTeamProjects')

        cy.get('[data-nav="team-devices"]').click()
        cy.wait('@getDevices')

        cy.get('[data-el="devices"]').contains('team2-device').click()
        cy.wait('@getDevice')

        cy.get('[data-el="banner-device-as-admin"]').should('exist')
    })
})

describe('FlowForge platform non-admin users', () => {
    beforeEach(() => {
        cy.login('bob', 'bbPassword')
        cy.home()
    })

    it('can login in', () => {
        cy.url().should('include', '/overview')
    })

    it('cannot view the "Admin Settings" in user options', () => {
        cy.get('[data-cy="user-options"]').get('.ff-dropdown-options').should('not.exist')
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
