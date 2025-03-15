---
navTitle: Teams
---

# Teams

Teams are groups of users that collaborate on their Node-RED applications.

## Managing teams

### Creating a new team

Users can create new teams. Creating a team requires a name and a unique url.
The user who creates the team is added as its "owner".

**Note**: Administrators might not [allow all users to create teams](../../admin/introduction.md#admin-settings).
FlowFuse Cloud does allow any user to create a new team.

### Adding team members

Each user with "owner" permissions on a team can invite new members on the "Members"
tab of the team page. Invitations can be sent to existing users on the platform by
they username, or via email. Users have up to 7 days to accept, or decline, the invitation
before it will expire.

### Removing team members

Owners can remove a member from a team by clicking the dropdown menu next to the username and selecting 
`Remove from team`. The team member will no longer have access to any team data.

## Role-based access control

The role a user has in a team determines what they are able to do. The following
table summaries what actions are available to the different roles.

| Role                                 | Owner | Member | Viewer | Dashboard Only |
|:-------------------------------------|:-----:|:------:|:------:|:--------------:|
| • Manage Team Settings               | ✓     | -      | -      | -              |
| • View Team Audit Log                | ✓     | -      | -      | -              |
| **Applications**                     |       |        |        |                |
| • Create Application                 | ✓     | -      | -      | -              |
| • Delete Application                 | ✓     | -      | -      | -              |
| • Modify Application Settings        | ✓     | -      | -      | -              |
| • View Application Logs              | ✓     | ✓      | ✓      | -              |
| **Instances**                        |       |        |        |                |
| • Create Instance                    | ✓     | -      | -      | -              |
| • Delete Instance                    | ✓     | -      | -      | -              |
| • Copy Instance                      | ✓     | -      | -      | -              |
| • View Instance Details              | ✓     | ✓      | ✓      | -              |
| • Start, Stop, Suspend Instance      | ✓     | -      | -      | -              |
| • Modify Instance Settings           | ✓     | -      | -      | -              |
| • Modify Environment Variables       | ✓     | ✓      | -      | -              |
| • Manage Assets                      | ✓     | ✓      | -      | -              |
| • Access Dashboard or HTTP endpoint  | ✓     | ✓      | ✓      | ✓              |
| • View Node-RED Logs                 | ✓     | ✓      | ✓      | -              |
| **Flows**                            |       |        |        |                |
| • Access Flow Editor                 | ✓     | ✓      | ✓      | -              |
| • Modify Flows                       | ✓     | ✓      | -      | -              |
| **Snapshots**                        |       |        |        |                |
| • Create Snapshot                    | ✓     | ✓      | -      | -              |
| • Restore Snapshot                   | ✓     | ✓      | -      | -              |
| • Set as Device Target               | ✓     | ✓      | -      | -              |
| • View Snapshots                     | ✓     | ✓      | ✓      | -              |
| • Download Snapshot                  | ✓     | ✓      | -      | -              |
| • Upload Snapshot                    | ✓     | -      | -      | -              |
| • Delete Snapshot                    | ✓     | -      | -      | -              |
| **Devices**                          |       |        |        |                |
| • View Devices                       | ✓     | ✓      | ✓      | -              |
| • Modify Device Settings             | ✓     | -      | -      | -              |
| • Modify Environment Variables       | ✓     | ✓      | -      | -              |
| • Assign to/Remove from Application  | ✓     | -      | -      | -              |
| • Assign to/Remove from Instance     | ✓     | -      | -      | -              |
| • Delete Device                      | ✓     | -      | -      | -              |
| • Bulk Move Devices                  | ✓     | -      | -      | -              |
| • Bulk Delete Devices                | ✓     | -      | -      | -              |
| **Team Members**                     |       |        |        |                |
| • Invite User                        | ✓     | -      | -      | -              |
| • Change Role                        | ✓     | -      | -      | -              |
| • Remove User from Team              | ✓     | - §1   | - §1   | - §1           |
| **Team Library**                     |       |        |        |                |
| • Add an item                        | ✓     | ✓      | -      | -              |
| • Modify an item                     | ✓     | ✓      | -      | -              |
| • Delete an item                     | ✓     | ✓      | -      | -              |
| **Team Broker**                      |       |        |        |                |
| • Create Client                      | ✓     | ✓      | -      | -              |
| • Delete Client                      | ✓     | ✓      | -      | -              |
| • List Clients                       | ✓     | ✓      | -      | -              |

Notes:
 - **§1** A user in any role can remove themselves from a team
 - Administrators users have owner-level access to all teams, but do not have access
 to the Flow Editor.

#### Changing roles

Owners can change a user's role by selecting "Change Role" in the menu on the
Team Members page. An Owner can only change their own role if the team has another
owner in place.
