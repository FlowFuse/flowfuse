describe('FlowFuse - Brokers', () => {
    describe('Third Party Broker', () => {
        it('should not display the clients tab for third party brokers and redirect to hierarchy when accessing it directly', () => {
            cy.intercept('GET', '/api/*/teams/*/broker/clients', {
                clients: [],
                meta: {},
                count: 0
            })
            cy.intercept('GET', '/api/*/teams/*/brokers', {
                brokers: [{
                    id: '1',
                    name: 'external-broker',
                    host: '',
                    port: 1883,
                    protocol: 'mqtt:',
                    ssl: false,
                    verifySSL: true,
                    clientId: ''
                }],
                meta: {},
                count: 0
            })

            cy.home()
            cy.get('[data-nav="team-brokers"]').click()

            cy.get('[data-nav="team-brokers-hierarchy"]').should('exist')
            cy.get('[data-nav="team-brokers-settings"]').should('exist')
            cy.get('[data-nav="team-brokers-clients"]').should('not.exist')

            cy.get('[data-el="add-new-broker"]').should('exist')
        })
    })
})
