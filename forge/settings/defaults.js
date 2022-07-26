module.exports = {
    // Platform license:
    license: null,

    // Instance ID:
    instanceId: null,

    // Secret used to sign cookies:
    cookieSecret: null,

    // Token to connect the platform client to the broker
    commsToken: null,

    // Whether the intial setup has been run
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

    // Can user's create their own teams
    'team:create': false,

    // Should we auto-create a team for a user when they register
    'user:team:auto-create': false,

    // Can external users be invited to join teams
    'team:user:invite:external': false
}
