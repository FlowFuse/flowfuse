---
navTitle: Teams
---

# Teams

Teams are groups of users that collaborate on their Node-RED applications.

## Managing Teams

### Creating a New Team

Users can create new teams. Creating a team requires a name and a unique url. The user who creates the team is added as its "owner".

**Note:** Administrators might not [allow all users to create teams](../../admin/introduction.md#admin-settings). FlowFuse Cloud does allow any user to create a new team.

### Adding Team Members

Each user with "owner" permissions on a team can invite new members on the "Members" tab of the team page. Invitations can be sent to existing users on the platform by their username, or via email. Users have up to 7 days to accept, or decline, the invitation before it will expire.

When inviting a member, you can assign them an initial role (Owner, Member, Viewer, or Dashboard Only). This role can be changed later by team owners. For more details on managing roles, see [Role-Based Access Control](../role-based-access-control.md).

### Removing Team Members

Owners can remove a member from a team by clicking the dropdown menu next to the username and selecting `Remove from team`. The team member will no longer have access to any team data.

## Role-Based Access Control

FlowFuse uses role-based access control to manage what users can do within teams and applications. For detailed information about roles, permissions, and access control at both team and application levels, see the [Role-Based Access Control documentation](../role-based-access-control.md).
