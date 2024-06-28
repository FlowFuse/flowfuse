declare namespace Cypress {
    interface Chainable<Subject> {
        login(username: string, password: string): Chainable<Subject>;
        logout(): Chainable<Subject>;
        
        home(): Chainable<Subject>;
        enableBilling(): Chainable<Subject>;
        applyBillingCreditToTeam(amountInCents: number): Chainable<Subject>;
        resetTermsAndCondition(): Chainable<Subject>;
        isInViewport(subject: [any]): Chainable<Subject>;
        clearBrowserData(): Chainable<Subject>;
        
        adminGetAllBlueprints(): Chainable<Subject>;
        adminEnableSignUp(): Chainable<Subject>;
        adminDisableSignUp(): Chainable<Subject>;
        adminEnableTeamAutoCreate(): Chainable<Subject>;
        adminDisableTeamAutoCreate(): Chainable<Subject>;
    }
}