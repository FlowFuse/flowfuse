describe('FlowForge - Team Library - With Billing', () => {
    beforeEach(() => {
        cy.enableBilling()

        cy.login('alice', 'aaPassword')
        cy.home()

        function addToLibrary (teamHashId, name, type) {
            const libraryURL = `storage/library/${teamHashId}/`

            cy.request('POST', `${libraryURL}${name}`, {
                type,
                meta: { metaName: name },
                body: 'contents'
            })
        }

        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            addToLibrary(team.id, 'bar3', 'flows')
            addToLibrary(team.id, 'test/foo/bar', 'flows')
            addToLibrary(team.id, 'test/foo/bar2', 'flows')
            addToLibrary(team.id, 'test/funcs/bar4', 'functions')
        })

        /*
          Library file structure:
            ├── bar3
            └── test
                └── foo
                    ├── bar
                    └── bar2
                └── funcs
                    └── bar4
        */
    })

    it('can create a project that will charge the user', () => {
        cy.request('GET', 'api/v1/teams').then((response) => {
            const team = response.body.teams[0]

            cy.request('GET', `/api/v1/teams/${team.id}/projects`)
        })
    })
})
