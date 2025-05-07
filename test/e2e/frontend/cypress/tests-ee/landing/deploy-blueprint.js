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

function prefillMultiStepInstanceForm () {
    // move along the multi-step form
    cy.get('[data-el="application-item"]').first().click()
    cy.get('[data-el="next-step"]').click()

    // select instance type
    cy.get('[data-form="project-type"] [data-item="tile-selection-option"]').first().click()

    // select template
    cy.get('[data-group="templates"] [data-item="tile-selection-option"]').first().click()

    // select nr-version
    cy.get('[data-form="multi-step-form"] [data-el="node-red-listbox"]').click()
    cy.get('[data-option="stack 1"]').click()

    cy.get('[data-el="next-step"]').click()

    cy.get('[data-group="blueprints"]').should('exist')
}

describe('FlowFuse - Deploy Blueprint', () => {
    before(function () {
        cy.isEmailEnabled()
            .then((isEnabled) => {
                if (!isEnabled) {
                    this.skip()
                }
            })

        cy.adminEnableSignUp()
        cy.adminEnableTeamAutoCreate()
    })

    after(() => {
        cy.adminDisableSignUp()
        cy.adminDisableTeamAutoCreate()
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

                prefillMultiStepInstanceForm()

                cy.wait('@setDefaultBlueprint')

                cy.get('[data-el="blueprint-tile"].active').contains('Blueprint 1')

                cy.get('[data-el="next-step"]').click()

                cy.wait('@createInstance')
                    .then((interception) => {
                        const instanceName = interception.request.body.name

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

                prefillMultiStepInstanceForm()

                cy.wait('@setDefaultBlueprint')

                cy.get('[data-el="blueprint-tile"].active').contains('Blueprint 1')

                cy.get('[data-el="next-step"]').click()

                cy.wait('@createInstance')
                cy.wait('@getInstance')

                cy.window().then((win) => expect(win.location.href).to.match(/.*\/instance\/[^/]+\/overview/))
            })

            it('can deploy pre-defined blueprints', () => {
                cy.adminGetAllBlueprints()

                cy.login('alice', 'aaPassword')

                cy.intercept('GET', '/api/*/projects/*').as('getInstance')

                cy.get('@allBlueprints')
                    .then(blueprints => {
                        const predefinedBlueprint = blueprints[1]

                        cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                        cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')
                        cy.intercept('POST', '/api/*/projects').as('createInstance')

                        cy.visit(`/deploy/blueprint?blueprintId=${predefinedBlueprint.id}`)

                        prefillMultiStepInstanceForm()

                        // check that the proper blueprint is selected
                        cy.get('[data-el="blueprint-tile"].active').contains(predefinedBlueprint.name)

                        cy.get('[data-el="next-step"]').click()

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
                cy.intercept('GET', '/api/*/projects/*').as('getInstance')
                cy.intercept('POST', '/api/*/projects').as('createInstance')
                interceptAndSetDefaultBlueprint()

                cy.visit('/deploy/blueprint')

                checkIfLandedOnLoginPage()

                followLoginForm()

                prefillMultiStepInstanceForm()

                cy.wait('@setDefaultBlueprint')

                // check that the proper blueprint is selected
                cy.get('[data-el="blueprint-tile"].active').contains('Blueprint 1')

                cy.get('[data-el="next-step"]').click()

                cy.wait('@createInstance')
                    .then((interception) => {
                        const instanceName = interception.request.body.name

                        cy.get('[data-el="page-name"]').contains(instanceName)

                        cy.contains('type1 / stack 1')

                        cy.wait('@getInstance')
                        return cy.window()
                    })
                    .then((win) => expect(win.location.href).to.match(/.*\/instance\/[^/]+\/overview/))
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

                prefillMultiStepInstanceForm()

                cy.wait('@setDefaultBlueprint')

                // check that the proper blueprint is selected
                cy.get('[data-el="blueprint-tile"].active').contains('Blueprint 1')

                cy.get('[data-el="next-step"]').click()

                cy.wait('@createInstance')
                    .then((interception) => {
                        const instanceName = interception.request.body.name

                        cy.get('[data-el="page-name"]').contains(instanceName)

                        cy.contains('type1 / stack 1')

                        cy.wait('@getInstance')
                        return cy.window()
                    })
                    .then((win) => expect(win.location.href).to.match(/.*\/instance\/[^/]+\/overview/))
            })

            it('can deploy pre-defined blueprints after logging in', () => {
                cy.adminGetAllBlueprints()

                cy.intercept('GET', '/api/*/projects/*').as('getInstance')

                cy.get('@allBlueprints')
                    .then(blueprints => {
                        const predefinedBlueprint = blueprints[1]

                        cy.intercept('GET', '/api/*/project-types*').as('getInstanceTypes')
                        cy.intercept('GET', '/api/*/flow-blueprints*').as('getFlowBlueprints')
                        cy.intercept('POST', '/api/*/projects').as('createInstance')

                        cy.visit(`/deploy/blueprint?blueprintId=${predefinedBlueprint.id}`)

                        checkIfLandedOnLoginPage()

                        followLoginForm()

                        prefillMultiStepInstanceForm()

                        // check that the proper blueprint is selected
                        cy.get('[data-el="blueprint-tile"].active').contains(predefinedBlueprint.name)

                        cy.get('[data-el="next-step"]').click()

                        return cy.wait('@createInstance')
                    })
                    .then((interception) => {
                        const instanceName = interception.request.body.name

                        cy.get('[data-el="page-name"]').contains(instanceName)

                        cy.contains('type1 / stack 1')

                        cy.wait('@getInstance')
                        return cy.window()
                    })
                    .then((win) => expect(win.location.href).to.match(/.*\/instance\/[^/]+\/overview/))
            })
        })
    })

    describe('Users without accounts', () => {
        it('that follow registration land on the deploy blueprint page with the default blueprint if no id is given', () => {
            const stamp = new Date().getTime()
            const newUser = {
                username: `formidable-padawan-${stamp}`,
                fullName: 'Ezra Bridger',
                email: `formidable-padawan-${stamp}@qwe.com`,
                password: 'super-secret-password'
            }
            cy.intercept('POST', '/api/*/projects').as('createInstance')
            interceptAndSetDefaultBlueprint()

            cy.visit('/deploy/blueprint')

            cy.get('[data-action="sign-up"]').click()

            cy.get('[data-form="signup-username"]').type(newUser.username)
            cy.get('[data-form="signup-fullname"]').type(newUser.fullName)
            cy.get('[data-form="signup-email"]').type(newUser.email)
            cy.get('[data-form="signup-password"]').type(newUser.password)
            cy.get('[data-form="signup-repeat-password"]').type(newUser.password)

            cy.get('[data-action="sign-up"]').click()

            cy.mhGetMailsByRecipient(newUser.email)
                .should('have.length', 1)
                .mhFirst()
                .mhGetBody()
                .then((body) => {
                    const verifyCode = body.match(/(\d\d\d\d\d\d)/)[0]
                    cy.wrap(verifyCode).as('verifyCode')
                })

            cy.get('@verifyCode')
                .then((verifyCode) => {
                    cy.get('[data-form="verify-token"]').type(verifyCode)
                    cy.get('[data-action="submit-verify-token"]').click()

                    cy.get('[data-form="application-name"] input').type('My first Application!')
                    cy.get('[data-form="application-description"] textarea').type('Coherent description goes here >><<')

                    cy.get('[data-el="next-step"]').click()

                    // select instance type
                    cy.get('[data-form="project-type"] [data-item="tile-selection-option"]').first().click()

                    // select template
                    cy.get('[data-group="templates"] [data-item="tile-selection-option"]').first().click()

                    // select nr-version
                    cy.get('[data-form="multi-step-form"] [data-el="node-red-listbox"]').click()
                    cy.get('[data-option="stack 1"]').click()

                    cy.get('[data-el="next-step"]').click()

                    cy.get('[data-group="blueprints"]').should('exist')

                    cy.wait('@setDefaultBlueprint')

                    // check that the proper blueprint is selected
                    cy.get('[data-el="blueprint-tile"].active').contains('Blueprint 1')

                    cy.get('[data-el="next-step"]').click()

                    return cy.wait('@createInstance')
                })
                .then((interception) => {
                    cy.get('[data-el="page-name"]').contains(interception.response.body.name)
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
            interceptAndSetDefaultBlueprint()
            cy.intercept('POST', '/api/*/projects').as('createInstance')

            cy.visit('/deploy/blueprint?blueprintId=non-existing-id')

            cy.get('[data-action="sign-up"]').click()

            cy.get('[data-form="signup-username"]').type(newUser.username)
            cy.get('[data-form="signup-fullname"]').type(newUser.fullName)
            cy.get('[data-form="signup-email"]').type(newUser.email)
            cy.get('[data-form="signup-password"]').type(newUser.password)
            cy.get('[data-form="signup-repeat-password"]').type(newUser.password)

            cy.get('[data-action="sign-up"]').click()

            cy.mhGetMailsByRecipient(newUser.email)
                .should('have.length', 1)
                .mhFirst()
                .mhGetBody()
                .then((body) => {
                    const verifyCode = body.match(/(\d\d\d\d\d\d)/)[0]
                    cy.wrap(verifyCode).as('verifyCode')
                })

            cy.get('@verifyCode')
                .then((verifyCode) => {
                    cy.get('[data-form="verify-token"]').type(verifyCode)
                    cy.get('[data-action="submit-verify-token"]').click()

                    cy.get('[data-form="application-name"] input').type('My first Application!')
                    cy.get('[data-form="application-description"] textarea').type('Coherent description goes here >><<')

                    cy.get('[data-el="next-step"]').click()

                    // select instance type
                    cy.get('[data-form="project-type"] [data-item="tile-selection-option"]').first().click()

                    // select template
                    cy.get('[data-group="templates"] [data-item="tile-selection-option"]').first().click()

                    // select nr-version
                    cy.get('[data-form="multi-step-form"] [data-el="node-red-listbox"]').click()
                    cy.get('[data-option="stack 1"]').click()

                    cy.get('[data-el="next-step"]').click()

                    cy.get('[data-group="blueprints"]').should('exist')

                    cy.wait('@setDefaultBlueprint')

                    // check that the proper blueprint is selected
                    cy.get('[data-el="blueprint-tile"].active').contains('Blueprint 1')

                    cy.get('[data-el="next-step"]').click()

                    return cy.wait('@createInstance')
                })
                .then((interception) => {
                    cy.get('[data-el="page-name"]').contains(interception.response.body.name)
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

            cy.adminGetAllBlueprints()

            cy.intercept('POST', '/api/*/projects').as('createInstance')

            cy.get('@allBlueprints')
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
                    cy.get('[data-form="signup-repeat-password"]').type(newUser.password)

                    cy.get('[data-action="sign-up"]').click()

                    cy.mhGetMailsByRecipient(newUser.email)
                        .should('have.length', 1)
                        .mhFirst()
                        .mhGetBody()
                })
                .then((body) => {
                    const verifyCode = body.match(/(\d\d\d\d\d\d)/)[0]
                    cy.wrap(verifyCode).as('verifyCode')
                })
                .then(() => cy.get('@verifyCode'))
                .then((verifyCode) => {
                    cy.get('[data-form="verify-token"]').type(verifyCode)
                    cy.get('[data-action="submit-verify-token"]').click()

                    cy.get('[data-form="application-name"] input').type('My first Application!')
                    cy.get('[data-form="application-description"] textarea').type('Coherent description goes here >><<')

                    cy.get('[data-el="next-step"]').click()

                    // select instance type
                    cy.get('[data-form="project-type"] [data-item="tile-selection-option"]').first().click()

                    // select template
                    cy.get('[data-group="templates"] [data-item="tile-selection-option"]').first().click()

                    // select nr-version
                    cy.get('[data-form="multi-step-form"] [data-el="node-red-listbox"]').click()
                    cy.get('[data-option="stack 1"]').click()

                    cy.get('[data-el="next-step"]').click()

                    cy.get('[data-group="blueprints"]').should('exist')
                })
                .then(() => cy.get('@predefinedBlueprint'))
                .then((predefinedBlueprint) => {
                    // check that the proper blueprint is selected
                    cy.get('[data-el="blueprint-tile"].active').contains(predefinedBlueprint.name)

                    cy.get('[data-el="next-step"]').click()

                    return cy.wait('@createInstance')
                })
                .then((interception) => {
                    cy.get('[data-el="page-name"]').contains(interception.response.body.name)
                    cy.contains('type1 / stack 1')

                    cy.url().should('match', /^.*\/instance\/.*\/overview/)
                })
        })
    })
})
