function followLoginForm () {
    cy.intercept('POST', '/account/login').as('getLogin')

    cy.get('[data-form="login"]').should('be.visible')

    cy.get('[data-el="login-username"]').type('alice')
    cy.get('[data-action="login"]').click()
    cy.get('[data-el="login-password"]').type('aaPassword')
    cy.get('[data-action="login"]').click()

    cy.wait('@getLogin')
}

function checkIfLandedOnLoginPage () {
    cy.intercept('GET', '/api/*/user/').as('getUser')
    cy.wait('@getUser')

    cy.window()
        .then((win) => {
            expect(win.location.href).to.match(/^[a-zA-Z]+:\/\/localhost:\d+\/?$/)
        })
}

describe('FlowFuse - Deploy Blueprint', () => {
    beforeEach(() => {
        cy.login('alice', 'aaPassword')
        cy.intercept('GET', '/api/*/flow-blueprints*').as('getSneakyBlueprints')
        cy.visit('/deploy/blueprint')
        cy.wait('@getSneakyBlueprints')
            .then(interception => interception.response.body.blueprints)
            .then(blueprints => {
                cy.wrap(blueprints).as('blueprints')
            })
        cy.logout()
        cy.clearBrowserData()
    })

    describe('Users with accounts', () => {
        describe('And authenticated', () => {
            beforeEach(() => {
                cy.intercept('POST', '/api/v1/auth/login').as('login')
                cy.login('alice', 'aaPassword')
            })

            it('reverts to the default blueprint when no blueprint id is given', () => {
                cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                cy.intercept('POST', '/api/*/projects').as('createInstance')

                cy.visit('/deploy/blueprint')

                cy.get('[data-el="page-name"]').contains('Deploy Blueprint 1')

                cy.get('[data-form="application-id"]').click()
                cy.get('[data-form="application-id"] .ff-dropdown-options').should('be.visible')
                cy.get('[data-form="application-id"] .ff-dropdown-options > .ff-dropdown-option:first').click()

                cy.get('[data-action="click-small-blueprint-tile"]').contains('Blueprint 1')
                cy.get('[data-form="project-type"]').children().first().click()

                cy.get('[data-form="project-name"] input')
                    .invoke('val')
                    .then((instanceName) => {
                        cy.get('[data-action="create-project"]').click()
                        cy.wait('@createInstance')

                        cy.get('[data-el="page-name"]').contains(instanceName)
                        cy.contains('type1 / stack 1')
                    })
            })

            it('reverts to the default blueprint when an invalid blueprint id is given', () => {
                cy.intercept('GET', '/api/v1/projects/*').as('getInstance')
                cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')
                cy.intercept('POST', '/api/*/projects').as('createInstance')

                cy.visit('/deploy/blueprint?blueprintId=non-existing-id')

                cy.get('[data-el="page-name"]').contains('Deploy Blueprint 1')

                cy.get('[data-form="application-id"]').click()
                cy.get('[data-form="application-id"] .ff-dropdown-options').should('be.visible')
                cy.get('[data-form="application-id"] .ff-dropdown-options > .ff-dropdown-option:first').click()

                cy.get('[data-action="click-small-blueprint-tile"]').contains('Blueprint 1')
                cy.get('[data-form="project-type"]').children().first().click()

                cy.get('[data-action="create-project"]').click()
                cy.wait('@createInstance')
                cy.wait('@getInstance')

                cy.window().then((win) => expect(win.location.href).to.match(/.*\/instance\/[^/]+\/overview/))
            })

            it('can deploy pre-defined blueprints', () => {
                cy.intercept('GET', '/api/v1/projects/*').as('getInstance')
                cy.get('@blueprints')
                    .then(blueprints => {
                        const predefinedBlueprint = blueprints[1]

                        cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                        cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')
                        cy.intercept('POST', '/api/*/projects').as('createInstance')

                        cy.visit(`/deploy/blueprint?blueprintId=${predefinedBlueprint.id}`)

                        cy.get('[data-el="page-name"]').contains(`Deploy ${predefinedBlueprint.name}`)

                        cy.get('[data-form="application-id"]').click()
                        cy.get('[data-form="application-id"] .ff-dropdown-options').should('be.visible')
                        cy.get('[data-form="application-id"] .ff-dropdown-options > .ff-dropdown-option:first').click()

                        cy.get('[data-action="click-small-blueprint-tile"]').contains(predefinedBlueprint.name)
                        cy.get('[data-form="project-type"]').children().first().click()

                        cy.get('[data-action="create-project"]').click()
                        cy.wait('@createInstance')

                        cy.wait('@getInstance')
                        cy.window()
                    })
                    .then((win) => {
                        expect(win.location.href).to.match(/.*\/instance\/[^/]+\/overview/)
                    })
            })
        })

        describe('And unauthenticated', () => {
            it('reverts to the default blueprint when no blueprint id is given after logging in', () => {
                cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                cy.intercept('POST', '/api/*/projects').as('createInstance')

                cy.visit('/deploy/blueprint')

                checkIfLandedOnLoginPage()

                followLoginForm()

                cy.get('[data-el="page-name"]').contains('Deploy Blueprint 1')

                cy.get('[data-form="application-id"]').click()
                cy.get('[data-form="application-id"] .ff-dropdown-options').should('be.visible')
                cy.get('[data-form="application-id"] .ff-dropdown-options > .ff-dropdown-option:first').click()

                cy.get('[data-action="click-small-blueprint-tile"]').contains('Blueprint 1')
                cy.get('[data-form="project-type"]').children().first().click()

                cy.get('[data-form="project-name"] input')
                    .invoke('val')
                    .then((instanceName) => {
                        cy.get('[data-action="create-project"]').click()
                        cy.wait('@createInstance')

                        cy.get('[data-el="page-name"]').contains(instanceName)
                        cy.contains('type1 / stack 1')
                    })
            })

            it('reverts to the default blueprint when an invalid blueprint id is given after logging in', () => {
                cy.intercept('GET', '/api/v1/projects/*').as('getInstance')
                cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')
                cy.intercept('POST', '/api/*/projects').as('createInstance')

                cy.visit('/deploy/blueprint?blueprintId=non-existing-id')

                checkIfLandedOnLoginPage()

                followLoginForm()

                cy.get('[data-el="page-name"]').contains('Deploy Blueprint 1')

                cy.get('[data-form="application-id"]').click()
                cy.get('[data-form="application-id"] .ff-dropdown-options').should('be.visible')
                cy.get('[data-form="application-id"] .ff-dropdown-options > .ff-dropdown-option:first').click()

                cy.get('[data-action="click-small-blueprint-tile"]').contains('Blueprint 1')
                cy.get('[data-form="project-type"]').children().first().click()

                cy.get('[data-action="create-project"]').click()
                cy.wait('@createInstance')
                cy.wait('@getInstance')

                cy.window().then((win) => expect(win.location.href).to.match(/.*\/instance\/[^/]+\/overview/))
            })

            it('can deploy pre-defined blueprints after logging in', () => {
                cy.intercept('GET', '/api/v1/projects/*').as('getInstance')
                cy.get('@blueprints')
                    .then(blueprints => {
                        const predefinedBlueprint = blueprints[1]

                        cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                        cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')
                        cy.intercept('POST', '/api/*/projects').as('createInstance')

                        cy.visit(`/deploy/blueprint?blueprintId=${predefinedBlueprint.id}`)

                        checkIfLandedOnLoginPage()

                        followLoginForm()

                        cy.get('[data-el="page-name"]').contains(`Deploy ${predefinedBlueprint.name}`)

                        cy.get('[data-form="application-id"]').click()
                        cy.get('[data-form="application-id"] .ff-dropdown-options').should('be.visible')
                        cy.get('[data-form="application-id"] .ff-dropdown-options > .ff-dropdown-option:first').click()

                        cy.get('[data-action="click-small-blueprint-tile"]').contains(predefinedBlueprint.name)
                        cy.get('[data-form="project-type"]').children().first().click()

                        cy.get('[data-action="create-project"]').click()
                        cy.wait('@createInstance')

                        cy.wait('@getInstance')
                        cy.window()
                    })
                    .then((win) => {
                        expect(win.location.href).to.match(/.*\/instance\/[^/]+\/overview/)
                    })
            })
        })
    })
})

// describe('Users without accounts', () => {
//     beforeEach(() => {
//         cy.login('alice', 'aaPassword')
//         cy.home()
//     })
// })
// })
