describe('FlowForge - Projects', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/project-types*').as('getProjectTypes')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/admin/project-types')
        cy.wait('@getProjectTypes')
    })

    it('can be created', () => {
        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/projects/create`)

            cy.intercept('POST', '/api/*/projects').as('createProject')

            cy.get('[data-action="create-project"]').should('be.disabled')

            // Pre-fills name
            cy.get('[data-form="project-name"] input').should(($input) => {
                const projectName = $input.val()
                expect(projectName.length).to.be.above(0)
            })

            cy.get('[data-form="project-name"] input').clear().type('my-project-name')
            cy.get('[data-action="create-project"]').should('be.disabled')

            cy.get('[data-form="project-type"]').contains('type1').click()
            cy.get('[data-action="create-project"]').should('not.be.disabled') // stack is auto selected

            cy.get('[data-form="project-stack"]').contains('stack1').click() // de-select
            cy.get('[data-action="create-project"]').should('be.disabled')

            cy.get('[data-form="project-stack"]').contains('stack1').click() // re-select

            cy.get('[data-form="project-template"]').should('exist') // template section visible for create

            cy.get('[data-action="create-project"]').should('not.be.disabled').click()

            cy.wait('@createProject')

            cy.contains('my-project-name')

            // Tidy-up
            cy.get('[data-el="cloud-instances"] .ff-kebab-menu').click()
            cy.get('[data-el="cloud-instances"] .ff-kebab-menu').find('.ff-list-item').contains('Delete').click()
            cy.get('[data-el="delete-project-dialog"]').within(() => {
                cy.get('[data-form="project-name"] input[type="text"]').type('my-project-name')
                cy.get('button.ff-btn.ff-btn--danger').click()
            })
        })
    })

    it('can be viewed', () => {
        cy.intercept('GET', '/api/*/projects/*').as('getProject')

        cy.visit('/')

        cy.get('[data-nav="team-projects"]')

        cy.wait('@getTeamProjects')

        cy.contains('project1').click()

        cy.wait('@getProject')

        cy.get('[data-el="banner-project-as-admin"]').should('not.exist')

        cy.get('[data-action="open-editor"]').should('exist')
    })


    it('are not permitted to have a duplicate name during creation', () => {
        cy.request('GET', 'api/v1/teams', { failOnStatusCode: false }).then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/projects/create`)

            cy.get('[data-form="project-name"] input').clear().type('project1')
            cy.get('[data-form="project-type"]').contains('type1').click()

            cy.get('[data-action="create-project"]').click()

            cy.get('[data-form="project-name"] [data-el="form-row-error"]').contains('name in use')
        })
    })
})

describe('FlowForge - Projects - With Billing', () => {
    beforeEach(() => {
        cy.enableBilling()
    })

    it('can create a project that will charge the user', () => {
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/projects/create`)

            cy.get('[data-el="charges-table"]').should('not.exist')

            cy.contains('type1').click()

            cy.get('[data-el="charges-table"]').should('exist')

            cy.get('[data-el="selected-project-type-name"]').contains('type1')
            cy.get('[data-el="selected-project-type-cost"]').contains('$15.00')
            cy.get('[data-el="selected-project-type-interval"]').contains('/mo')

            cy.get('[data-el="form-row-description"]').contains('$15.00 now').contains('$15.00/month')

            cy.get('[data-action="create-project"]').should('be.disabled')

            cy.get('[id="billing-confirmation"][data-el="form-row-title"]').click()

            cy.get('[data-action="create-project"]').should('not.be.disabled').click()
        })
    })

    it('considers any credit balance the team may have when creating a project', () => {
        cy.applyBillingCreditToTeam(1001)
        cy.login('alice', 'aaPassword')
        cy.home()

        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            cy.visit(`/team/${team.slug}/projects/create`)

            cy.wait('@getTeamBilling')

            cy.get('[data-el="charges-table"]').should('not.exist')

            cy.contains('type1').click()

            cy.get('[data-el="charges-table"]').should('exist')

            cy.get('[data-el="credit-balance-banner"]').should('exist').contains('$10.01')

            cy.get('[data-el="selected-project-type-name"]').contains('type1')
            cy.get('[data-el="selected-project-type-cost"]').contains('$15.00')
            cy.get('[data-el="selected-project-type-interval"]').contains('/mo')

            cy.get('[data-el="credit-balance-row"]').should('exist')
            cy.get('[data-el="credit-balance-amount"]').contains('$10.01')

            cy.get('[data-el="form-row-description"]').contains('$4.99 now').contains('$15.00/month')

            cy.get('[data-action="create-project"]').should('be.disabled')

            cy.get('[id="billing-confirmation"][data-el="form-row-title"]').click()

            cy.get('[data-action="create-project"]').should('not.be.disabled').click()
        })
    })
})

describe('FlowForge stores audit logs for a project', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/team/ateam/audit-log')
    })

    it('when it is created', () => {
        cy.get('.ff-audit-entry').contains('Project Created')
    })

    it('when it is deleted', () => {
        cy.get('.ff-audit-entry').contains('Project Deleted')
    })
})

describe('FlowForge Team Audit Logs filtering', () => {
    beforeEach(() => {
        cy.intercept('GET', '/api/*/teams/*/audit-log*').as('getAuditLog')

        cy.login('alice', 'aaPassword')
        cy.home()
        cy.visit('/team/ateam/audit-log')
    })

    it('provides a list of users to filter by', () => {
        cy.get('[data-el="filter-users"]').find('.ff-dropdown-option').should('have.length', 3)
    })

    it('enables filtering by a user', () => {
        cy.get('[data-cy="filter-users"] .ff-dropdown-options').should('not.exist')

        // Check Alice Skywalker Events - should be 4
        cy.get('[data-el="filter-users"] .ff-dropdown').click()
        cy.get('[data-el="filter-users"] .ff-dropdown-options').should('be.visible')

        cy.get('[data-el="filter-users"] .ff-dropdown-options > .ff-dropdown-option').eq(1).contains('Alice Skywalker').should('be.visible')
        cy.get('[data-el="filter-users"] .ff-dropdown-options > .ff-dropdown-option').eq(1).click()
        cy.wait('@getAuditLog')

        // length when running in isolation is 4, in tandem with the rest of the E2E tests - it's 6.
        cy.get('[data-el="audit-log"]').find('.ff-audit-entry').should('have.length.least', 4)

        // Check Bob Solo Events - should be 0
        cy.get('[data-el="filter-users"] .ff-dropdown').click()
        cy.get('[data-el="filter-users"] .ff-dropdown-options').should('be.visible')

        cy.get('[data-el="filter-users"] .ff-dropdown-options > .ff-dropdown-option').eq(2).contains('Bob Solo').should('be.visible')
        cy.get('[data-el="filter-users"] .ff-dropdown-options > .ff-dropdown-option').eq(2).click()
        cy.wait('@getAuditLog')

        cy.get('[data-el="audit-log"]').find('.ff-audit-entry').should('have.length', 0)
    })
})
