module.exports = {
    // Platform license:
    license: null,

    // Instance ID:
    instanceId: null,

    // Secret used to sign cookies:
    cookieSecret: null,

    // Token to connect the platform client to the broker
    commsToken: null,

    // Whether the initial setup has been run
    'setup:initialised': false,

    // Is telemetry enabled?
    'telemetry:enabled': true,

    // Can users signup via the login page
    'user:signup': false,

    // Can users reset their password via the login page
    'user:reset-password': false,

    // Users are required to acknowledge they have accepted TCs on signup
    'user:tcs-required': false,

    // URL to link to Terms & Conditions on signup
    'user:tcs-url': '',

    // flag for Terms & Conditions date
    'user:tcs-date': null,

    // flag for required offboarding
    'user:offboarding-required': false,

    // URL to link to offboarding form
    'user:offboarding-url': '',

    // Can users create their own teams
    'team:create': false,

    // Should we auto-create a team for a user when they register
    'user:team:auto-create': false,
    // The type of team to create - if null, will default to the 'first' in the list
    'user:team:auto-create:teamType': null,
    // The type of instance to auto-create when an account signs up, defaults to none.
    'user:team:auto-create:instanceType': null,
    // Auto-create a default application whenever a team is created
    'user:team:auto-create:application': false,

    // Can external users be invited to join teams
    'team:user:invite:external': false,

    // Is the trial feature enabled?
    'user:team:trial-mode': false,
    'user:team:trial-mode:duration': 0, // How many days - required if trials enabled
    'user:team:trial-mode:projectType': null, // Project type that is included in the trial - required if trials enabled

    'branding:account:signUpTopBanner': null,
    'branding:account:signUpLeftBanner': null,

    // Has a stats monitoring token been created?
    'platform:stats:token': false,

    // Team Broker topic cache
    'team:broker:topics': null
}
