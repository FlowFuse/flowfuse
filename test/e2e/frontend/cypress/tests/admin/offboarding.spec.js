describe('FlowForge - Team Membership', () => {
    it('admin can enable redirect for offboarding users', () => {
        cy.intercept('PUT', '/api/*/settings').as('putSettings')

        cy.login('alice', 'aaPassword')

        cy.home()

        cy.visit('admin/settings/general') // go to admin settings

        cy.wait(['@getSettings'])

        // first ensure all offboarding-url elements are hidden except offboarding-required
        cy.get('[data-el="offboarding-required"]').find('input').should('have.length', 1)
        cy.get('[data-el="user:offboarding-url"]').should('have.length', 0)

        // ensure save button is disabled until a change
        cy.get('[data-action="save-settings"]').should('be.disabled')

        cy.get('[data-el="offboarding-required"]').find('span.checkbox').click()

        // the URL input should now be present
        cy.get('[data-el="offboarding-url"]').should('have.length', 1)

        // ensure save button is STILL disabled (since URL is empty)
        cy.get('[data-action="save-settings"]').should('be.disabled')

        // update the URL
        cy.get('[data-el="offboarding-url"]').find('input').type('www.a.b.c')

        // ensure save button is STILL disabled (since invalid URL)
        cy.get('[data-action="save-settings"]').should('be.disabled')

        cy.get('[data-el="offboarding-url"]').contains('A valid URL for the offboarding redirect must be set.')

        cy.get('[data-el="offboarding-url"]').find('input').clear()
        cy.get('[data-el="offboarding-url"]').find('input').type('http://a.b.c')

        // ensure save button is now enabled until a change
        cy.get('[data-action="save-settings"]').should('be.enabled')

        // save settings
        cy.get('[data-action="save-settings"]').click()
        cy.wait(['@putSettings', '@getSettings'])
    })

    it('users are not redirected to an external url when they offboard', () => {
        cy.intercept('GET', '/api/*/settings').as('putSettings')

        cy.login('boba', 'ffPassword')

        cy.home()

        cy.visit('account/settings') // go to admin settings

        cy.wait(['@getSettings'])

        cy.get('[data-action="delete-account"]').click()

        // todo the offboarding redirect stops on a blank screen @see https://github.com/FlowFuse/flowfuse/issues/3849
        //  will fix after the above issue is resolved
        // cy.get('[data-action="dialog-confirm"]').click()
        // cy.url().should('eq', 'http://localhost:3001/')
    })

    it('users are redirected to an external url when they offboard', () => {
        cy.intercept('GET', '/api/*/settings', (req) => req.reply(res => {
            res.body = {
                ...res.body,
                ...{
                    'user:offboarding-required': true,
                    'user:offboarding-url': 'https://nodered.org/about/?search=rick'
                }
            }
            return res
        })).as('putSettings')

        cy.login('grey', 'ggPassword')

        cy.home()

        cy.visit('account/settings') // go to admin settings

        cy.wait(['@getSettings'])

        cy.get('[data-action="delete-account"]').click()
        cy.get('[data-action="dialog-confirm"]').click()

        cy.origin('https://nodered.org', () => {
            cy.url().should('to.match', /^https:\/\/nodered\.org\/about\/\?search=rick/)
        })
    })
})
