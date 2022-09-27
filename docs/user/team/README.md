# Teams

Teams are groups of users that collaborate on their projects.

## Managing teams

### Creating a new team

Users can create new teams. Creating a team requires a name and a unique url.
The user who creates the team is added as its "owner".

**Note**: Administrators might not [allow all users to create teams](../../admin#admin-settings).
FlowForge Cloud does allow any user to create a new team.

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

| Role                                 | Owner | Member | Viewer |
|:-------------------------------------|:-----:|:------:|:------:|
| Manage Team Settings                 | ✓     | -      | -      |
| View Team Audit Log                  | ✓     | -      | -      |
| **Projects**                         |       |        |        |
| • Create Project                     | ✓     | -      | -      |
| • Delete Project                     | ✓     | -      | -      |
| • Copy Project                       | ✓     | -      | -      |
| • View Project Details               | ✓     | ✓      | ✓      |
| • Start, Stop, Suspend Project       | ✓     | -      | -      |
| • Modify Project Settings            | ✓     | -      | -      |
| • Modify Environment Variables       | ✓     | ✓      | -      |
| **Flows**                            |       |        |        |
| • Access Flow Editor                 | ✓     | ✓      | ✓      |
| • Modify Flows                       | ✓     | ✓      | -      |
| **Project Snapshots**                |       |        |        |
| • View Snapshots                     | ✓     | ✓      | ✓      |
| • Create Snapshot                    | ✓     | ✓      | -      |
| • Rollback                           | ✓     | ✓      | -      |
| • Set as Device Target               | ✓     | ✓      | -      |
| • Delete Snapshot                    | ✓     | -      | -      |
| **Devices**                          |       |        |        |
| • View Devices                       | ✓     | ✓      | ✓      |
| • Modify Device Settings             | ✓     | -      | -      |
| • Modify Environment Variables       | ✓     | ✓      | -      |
| • Assign to/Remove from Project      | ✓     | -      | -      |
| • Delete Device                      | ✓     | -      | -      |
| **Team Members**                     |       |        |        |
| • Invite User                        | ✓     | -      | -      |
| • Change Role                        | ✓     | -      | -      |
| • Remove User from Team              | ✓     | - §1   | - §1   |

Notes:
 - **§1** A user in any role can remove themselves from a team
 - Administrators users have owner-level access to all teams, but do not have access
 to the Flow Editor.

#### Changing roles

Owners can change a user's role by selecting "Change Role" in the menu on the
Team Members page. An Owner can only change their own role if the team has another
owner in place.
