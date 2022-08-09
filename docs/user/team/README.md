# Teams

Teams are groups of users that collaborate on their projects.

## Managing teams

### Creating a new team

Users can create new teams. Creating a team requires a name and an instance wide
unique slug. When a team is created the user that did is added as "owner".

**Note**: Administrators might not [allow all users to create teams](../../admin#admin-settings).
FlowForge Cloud does allow any user to create a new team.

### Adding team members

Each user with "owner" permissions on a team can add new members on the "Members"
tab of the team pages. Adding members is done by inviting them by either email or
FlowForge username. After submitting the form an invite is created for the new
user which expires in 7 days. Once accepted the user is added as "Member".

### Removing team members

Owners can remove a member from a team by clicking the dropdown menu next to the username and selecting 
`Remove from team`. The team member will no longer have access to any team data.

## Role based access control

Members can have 1 role for all projects in the team. Below there's a table to
describe the different Roles apply for all projects in the team

| Role                                 | Owner | Member |
|:-------------------------------------|:-----:|:------:|
|                                      |       |        |
| Manage Billing                       | ✓     | -      |
| **Overview**                         |       |        |
| • View Projects                      | ✓     | ✓      |
| • Create Project                     | ✓     | -      |
|                                      |       |        |
| **Projects**                         |       |        |
| • View Projects                      | ✓     | ✓      |
| • Create Project                     | ✓     | -      |
|                                      |       |        |
| **Project**                          |       |        |
| • Actions Menu                       | ✓     | -      |
| • Editor Link + Status               | ✓     | ✓      |
| • Modifiy Flows                      | ✓     | ✓      |
|                                      |       |        |
| **Selected Project**                 |       |        |
| • Overview                           | ✓     | ✓      |
| • Activity                           | ✓     | ✓      |
| • Snapshots...                       |       |        |
|     • View Snapshots                 | ✓     | ✓      |
|     • Create Snapshot                | ✓     | -      |
|     • Rollback                       | ✓     | -      |
|     • Set as Device Target           | ✓     | ✓      |
|     • Delete Snapshot                | ✓     | -      |
| • Devices...                         |       |        |
|     • View Devices                   | ✓     | ✓      |
|     • Register Device                | ✓     | -      |
|     • Device Row Menu                | ✓     | -      |
|     • Device Overview                | ✓     | ✓      |
|     • Device Settings...             | ✓     |        |
|         • Edit Device                | ✓     | ✓      |
|         • View Environment Variables | ✓     | ✓      |
|         • Edit Environment Variables | ✓     | -      |
|         • Delete Device              | ✓     | -      |
| • Logs                               | ✓     | ✓      |
| • Settings...                        | -     | -      |
|     * View General                   | ✓     | ✓      |
|     * View Environment Variables     | ✓     | ✓      |
|     * Edit Environment Variables     | ✓     | -      |
|     * View Other Settings            | ✓     | -      |
|     * Edit Other Settings            | ✓     | -      |
|                                      |       |        |
| **Devices**                          |       |        |
| • View Devices                       | ✓     | ✓      |
| • Register Device                    | ✓     | -      |
| • Device Row Menu                    | ✓     | -      |
| • Device Overview                    | ✓     | ✓      |
| • Device Settings...                 | ✓     |        |
|     • General                        | ✓     | ✓      |
|     • Edit Device                    | ✓     | -      |
|     • View Environment Variables     | ✓     | ✓      |
|     • Edit Environment Variables     | ✓     | -      |
|     • Delete Device                  | ✓     | -      |
|                                      |       |        |
| **Members**                          |       |        |
| • Invite                             | ✓     | -      |
| • Member List Row Menu               | ✓     | ✓      |
|     • Change Role                    | ✓     | -      |
|     • Remove From Team               | ✓     | ✓      |
|     • Remove Other from Team         | ✓     | -      |
|                                      |       |        |
| **Audit Log**                        | ✓     | -      |
| **Team Settings**                    | ✓     | -      |

#### Changing roles

Owners can change roles by selecting "Change Role" on the members tab of a team.
The member selected will after submitting have a new role assigned with the new
authorization scheme.
