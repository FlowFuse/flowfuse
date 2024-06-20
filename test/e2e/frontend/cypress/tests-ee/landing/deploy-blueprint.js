function followLoginForm (username = 'alice', password = 'aaPassword') {
    cy.intercept('POST', '/account/login').as('getLogin')

    cy.get('[data-form="login"]').should('be.visible')

    cy.get('[data-el="login-username"]').type(username)
    cy.get('[data-action="login"]').click()
    cy.get('[data-el="login-password"]').type(password)
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

function interceptAndSetDefaultBlueprint () {
    // Intercepting the blueprints call to avoid side effects when running multiple suites at once
    // other suites alter the default blueprint, so we need to set it back to a predictable state
    cy.intercept(
        'GET',
        '/api/*/flow-blueprints*',
        (req) => req.reply(res => {
            const blueprints = res.body.blueprints.map(bp => {
                if (bp.name === 'Blueprint 1') {
                    bp.default = 1
                } else {
                    bp.default = 0
                }
                return bp
            })
            res.body = { ...res.body, ...{ blueprints } }
            return res
        })
    ).as('setDefaultBlueprint')
}

function adminEnableSignup () {
    cy.url()
        .then((currentUrl) => {
            if (!currentUrl.includes('/admin/settings/general')) {
                cy.visit('/admin/settings/general')
            }
        })
        .then(() => cy.get('[data-el="enable-signup"] input'))
        .then(($checkbox) => {
            if (!$checkbox.is(':checked')) {
                cy.get('[data-el="enable-signup"] .ff-checkbox').click()
                cy.get('[data-action="save-settings"]').click()
            }
        })
}

function adminSetStarterTeamType () {
    cy.url()
        .then((currentUrl) => {
            if (!currentUrl.includes('/admin/settings/general')) {
                cy.visit('/admin/settings/general')
            }
        })
        .then(() => cy.get('[data-el="team-auto-create"] input'))
        .then($checkbox => {
            if (!$checkbox.is(':checked')) {
                cy.get('[data-el="team-auto-create"] .ff-checkbox')
                    .click()
                cy.get('[data-action="save-settings"]')
                    .click()
            }
        })
}

function adminDisableStarterTeamType () {
    cy.url()
        .then((currentUrl) => {
            if (!currentUrl.includes('/admin/settings/general')) {
                cy.visit('/admin/settings/general')
            }
        })
        .then(() => cy.get('[data-el="team-auto-create"] input'))
        .then($checkbox => {
            if ($checkbox.is(':checked')) {
                cy.get('[data-el="team-auto-create"] .ff-checkbox').click()
                cy.get('[data-action="save-settings"]').click()
            }
        })
}

function adminDisableStartup () {
    cy.url()
        .then((currentUrl) => {
            if (!currentUrl.includes('/admin/settings/general')) {
                cy.visit('/admin/settings/general')
            }
        })
        .then(() => cy.get('[data-el="enable-signup"] input'))
        .then(($checkbox) => {
            if ($checkbox.is(':checked')) {
                cy.get('[data-el="enable-signup"] .ff-checkbox').click()
                cy.get('[data-action="save-settings"]').click()
            }
        })
}

describe('FlowFuse - Deploy Blueprint', () => {
    before(() => {
        cy.login('alice', 'aaPassword')

        adminEnableSignup()
        adminSetStarterTeamType()

        cy.logout()
        cy.clearBrowserData()
    })

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

    after(() => {
        cy.login('alice', 'aaPassword')

        adminDisableStartup()
        adminDisableStarterTeamType()

        cy.logout()
        cy.clearBrowserData()
    })

    describe('Users with accounts', () => {
        describe('And authenticated', () => {
            beforeEach(() => {
                cy.intercept('POST', '/api/*/auth/login').as('login')
                cy.login('alice', 'aaPassword')
            })

            it('reverts to the default blueprint when no blueprint id is given', () => {
                cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                cy.intercept('POST', '/api/*/projects').as('createInstance')
                interceptAndSetDefaultBlueprint()

                cy.visit('/deploy/blueprint')

                cy.wait('@setDefaultBlueprint')

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
                cy.intercept('GET', '/api/*/projects/*').as('getInstance')
                cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')
                cy.intercept('POST', '/api/*/projects').as('createInstance')
                interceptAndSetDefaultBlueprint()

                cy.visit('/deploy/blueprint?blueprintId=non-existing-id')

                cy.wait('@setDefaultBlueprint')

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
                cy.intercept('GET', '/api/*/projects/*').as('getInstance')
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
                interceptAndSetDefaultBlueprint()

                cy.visit('/deploy/blueprint')

                checkIfLandedOnLoginPage()

                followLoginForm()

                cy.wait('@setDefaultBlueprint')

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
                cy.intercept('GET', '/api/*/projects/*').as('getInstance')
                cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')
                cy.intercept('POST', '/api/*/projects').as('createInstance')
                interceptAndSetDefaultBlueprint()

                cy.visit('/deploy/blueprint?blueprintId=non-existing-id')

                checkIfLandedOnLoginPage()

                followLoginForm()

                cy.wait('@setDefaultBlueprint')

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
                cy.intercept('GET', '/api/*/projects/*').as('getInstance')
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

    describe('Users without accounts', () => {
        beforeEach(() => {
            // cy.login('alice', 'aaPassword')
            // cy.home()
        })

        it('that follow registration land on the deploy blueprint page with the default blueprint if no id is given', () => {
            const stamp = new Date().getTime()
            const newUser = {
                username: `formidable-padawan-${stamp}`,
                fullName: 'Ezra Bridger',
                email: `formidable-padawan-${stamp}@qwe.com`,
                password: 'super-secret-password'
            }
            cy.intercept('POST', '/api/*/projects').as('createInstance')

            cy.visit('/deploy/blueprint')

            cy.get('[data-action="sign-up"]').click()

            cy.get('[data-form="signup-username"]').type(newUser.username)
            cy.get('[data-form="signup-fullname"]').type(newUser.fullName)
            cy.get('[data-form="signup-email"]').type(newUser.email)
            cy.get('[data-form="signup-password"]').type(newUser.password)

            cy.get('[data-action="sign-up"]').click()

            cy.mhGetMailsByRecipient(newUser.email)
                .should('have.length', 1)
                .mhFirst()
                .mhGetBody()
                .then((body) => {
                    const activationLink = body.match(/(http|https):\/\/.*\/account\/verify\/\S+/)[0]
                    cy.wrap(activationLink).as('activationLink')
                })

            cy.get('@activationLink')
                .then((activationLink) => {
                    cy.visit(activationLink)

                    cy.get('[data-action="verify-email"]').click()

                    followLoginForm(newUser.username, newUser.password)

                    cy.get('[data-form="application-name"]').type('My first Application!')
                    cy.get('[data-form="application-description"]').type('Coherent description goes here >><<')

                    cy.get('[data-action="click-small-blueprint-tile"]').contains('Blueprint 1')
                    cy.get('[data-form="project-type"]').children().first().click()

                    return cy.get('[data-form="project-name"] input')
                        .invoke('val')
                })
                .then((instanceName) => {
                    cy.get('[data-action="create-project"]').click()
                    cy.wait('@createInstance')

                    cy.get('[data-el="page-name"]').contains(instanceName)
                    cy.contains('type1 / stack 1')

                    cy.url().should('match', /^.*\/instance\/.*\/overview/)
                })
        })

        it('that follow registration land on the deploy blueprint page with the default blueprint when an invalid blueprint id is given', () => {
            const stamp = new Date().getTime()
            const newUser = {
                username: `formidable-padawan-${stamp}`,
                fullName: 'Ezra Bridger',
                email: `formidable-padawan-${stamp}@qwe.com`,
                password: 'super-secret-password'
            }
            cy.intercept('POST', '/api/*/projects').as('createInstance')

            cy.visit('/deploy/blueprint?blueprintId=non-existing-id')

            cy.get('[data-action="sign-up"]').click()

            cy.get('[data-form="signup-username"]').type(newUser.username)
            cy.get('[data-form="signup-fullname"]').type(newUser.fullName)
            cy.get('[data-form="signup-email"]').type(newUser.email)
            cy.get('[data-form="signup-password"]').type(newUser.password)

            cy.get('[data-action="sign-up"]').click()

            cy.mhGetMailsByRecipient(newUser.email)
                .should('have.length', 1)
                .mhFirst()
                .mhGetBody()
                .then((body) => {
                    const activationLink = body.match(/(http|https):\/\/.*\/account\/verify\/\S+/)[0]
                    cy.wrap(activationLink).as('activationLink')
                })

            cy.get('@activationLink')
                .then((activationLink) => {
                    cy.visit(activationLink)

                    cy.get('[data-action="verify-email"]').click()

                    followLoginForm(newUser.username, newUser.password)

                    cy.get('[data-form="application-name"]').type('My first Application!')
                    cy.get('[data-form="application-description"]').type('Coherent description goes here >><<')

                    cy.get('[data-action="click-small-blueprint-tile"]').contains('Blueprint 1')
                    cy.get('[data-form="project-type"]').children().first().click()

                    return cy.get('[data-form="project-name"] input')
                        .invoke('val')
                })
                .then((instanceName) => {
                    cy.get('[data-action="create-project"]').click()
                    cy.wait('@createInstance')

                    cy.get('[data-el="page-name"]').contains(instanceName)
                    cy.contains('type1 / stack 1')

                    cy.url().should('match', /^.*\/instance\/.*\/overview/)
                })
        })

        it('that follow registration land on the deploy blueprint page with the correct predefined blueprint', () => {
            const stamp = new Date().getTime()
            const newUser = {
                username: `formidable-padawan-${stamp}`,
                fullName: 'Ezra Bridger',
                email: `formidable-padawan-${stamp}@qwe.com`,
                password: 'super-secret-password'
            }
            cy.intercept('POST', '/api/*/projects').as('createInstance')

            cy.get('@blueprints')
                .then(blueprints => {
                    const predefinedBlueprint = blueprints[1]
                    cy.wrap(predefinedBlueprint).as('predefinedBlueprint')

                    cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                    cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')
                    cy.intercept('POST', '/api/*/projects').as('createInstance')

                    cy.visit(`/deploy/blueprint?blueprintId=${predefinedBlueprint.id}`)

                    cy.get('[data-action="sign-up"]').click()

                    cy.get('[data-form="signup-username"]').type(newUser.username)
                    cy.get('[data-form="signup-fullname"]').type(newUser.fullName)
                    cy.get('[data-form="signup-email"]').type(newUser.email)
                    cy.get('[data-form="signup-password"]').type(newUser.password)

                    cy.get('[data-action="sign-up"]').click()

                    cy.mhGetMailsByRecipient(newUser.email)
                        .should('have.length', 1)
                        .mhFirst()
                        .mhGetBody()
                })
                .then((body) => {
                    const activationLink = body.match(/(http|https):\/\/.*\/account\/verify\/\S+/)[0]
                    cy.wrap(activationLink).as('activationLink')
                })
                .then(() => cy.get('@activationLink'))
                .then((activationLink) => {
                    cy.visit(activationLink)

                    cy.get('[data-action="verify-email"]').click()

                    followLoginForm(newUser.username, newUser.password)

                    cy.get('[data-form="application-name"]').type('My first Application!')
                    cy.get('[data-form="application-description"]').type('Coherent description goes here >><<')
                })
                .then(() => cy.get('@predefinedBlueprint'))
                .then((predefinedBlueprint) => {
                    cy.get('[data-action="click-small-blueprint-tile"]').contains(predefinedBlueprint.name)
                    cy.get('[data-form="project-type"]').children().first().click()

                    return cy.get('[data-form="project-name"] input')
                        .invoke('val')
                })
                .then((instanceName) => {
                    cy.get('[data-action="create-project"]').click()
                    cy.wait('@createInstance')

                    cy.get('[data-el="page-name"]').contains(instanceName)
                    cy.contains('type1 / stack 1')

                    cy.url().should('match', /^.*\/instance\/.*\/overview/)
                })
                .then(() => cy.window())
                .then((win) => {
                    expect(win.location.href).to.match(/.*\/instance\/[^/]+\/overview/)
                })
        })
    })
})
