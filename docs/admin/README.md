# Administering FlowForge


## Getting started

 - [Understanding the FlowForge Architecture](../contribute/architecture.md)
 - [Install](../install) - requirements, deployment models, installation methods
 - [`flowforge.yml` configuration](../install/configuration.md) - base platform configuration, done before you run.
 - [First Run Setup](../install/first-run.md) - create your admin user
 - [FlowForge Concepts](../user/concepts.md)
 - [Usage Telemetry](./telemetry.md)

## Administering FlowForge

### Accessing the Admin Settings

The Admin Settings can be accessed from the main menu:

<img src="images/admin-menu-option.png" width=300 />

### Admin Settings

The Admin Settings view lets you manage the platform and its users.

With the 0.1.0 release, the following settings are available:

 - **Allow new users to register on the login screen** (default: `false`)

    With this option enabled, the platform login page allows visitors to register
    with the platform.

    This option is only available if email sending has been enabled.

 - **Create a personal team for users when they register** (default: `false`)

    With this option enabled, the platform will automatically create a Team
    for the user. This allows them to start creating projects straight-away.

    By default, this doesn't happen, which means the user must either manually
    create the Team (if that option is enabled), or be invited to an existing
    Team.

 - **Allow users to create teams** (default: `false`)

    This option allows users to create new Teams on the platform. By default,
    it is not enabled which means all Teams must be created by an Admin.

 - **Allow users to invite external users to teams** (default: `false`)

    This option allows users to invite people to join a Team who are not currently
    registered users of the platform. It sends an email with an invitation to
    sign-up to the platform and join the Team.

    By default, this is not enabled - users must be added by an Admin.

    This option is only available if email sending has been enabled.

### Managing Users

The Users page of Admin Settings can be used to manage the user on the platform.

It can be used to:

 - Add new users to the platform.

    With the 0.1.0 release, the admin sets the new user's password and it is left
    to the admin to share the login details with the user outside of the platform.

 - Edit a user's details.

    This includes making them an admin - giving them full access to the platform.

It also provides a list of all pending user invitations, showing who invited who
to what team.

### Managing Teams

With the 0.1.0 release, the Teams page just lists the teams on the platform.

Further team management options will come in later releases.
