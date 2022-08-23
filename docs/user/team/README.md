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
|                                      |       |        |
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
| &emsp; • View Snapshots                 | ✓     | ✓      |
| &emsp; • Create Snapshot                | ✓     | ✓      |
| &emsp; • Rollback                       | ✓     | ✓      |
| &emsp; • Set as Device Target           | ✓     | ✓      |
| &emsp; • Delete Snapshot                | ✓     | -      |
| • Devices...                         |       |        |
| &emsp; • View Devices                   | ✓     | ✓      |
| &emsp; • Register Device                | ✓     | -      |
| &emsp; • Device Row Menu                | ✓     | ✓      |
| &emsp; • Device Row Menu > delete device | ✓     | -      |
| &emsp; • Device Overview                | ✓     | ✓      |
| &emsp; • Device Settings...             | ✓     |        |
| &emsp;&emsp; • Edit Device                | ✓     | ✓      |
| &emsp;&emsp; • View Environment Variables | ✓     | ✓      |
| &emsp;&emsp; • Edit Environment Variables | ✓     | ✓      |
| &emsp;&emsp; • Delete Device              | ✓     | -      |
| • Logs                               | ✓     | ✓      |
| • Settings...                        | -     | -      |
| &emsp; • View General                   | ✓     | ✓      |
| &emsp; • View Environment Variables     | ✓     | ✓      |
| &emsp; • Edit Environment Variables     | ✓     | ✓      |
| &emsp; • View Other Settings            | ✓     | -      |
| &emsp; • Edit Other Settings            | ✓     | -      |
|                                      |       |        |
| **Devices**                          |       |        |
| • View Devices                       | ✓     | ✓      |
| • Register Device                    | ✓     | -      |
| • Device Row Menu                    | ✓     | -      |
| • Device Overview                    | ✓     | ✓      |
| • Device Settings...                 | ✓     |        |
| &emsp; • General                        | ✓     | ✓      |
| &emsp; • Edit Device                    | ✓     | -      |
| &emsp; • View Environment Variables     | ✓     | ✓      |
| &emsp; • Edit Environment Variables     | ✓     | ✓      |
| &emsp; • Delete Device                  | ✓     | -      |
|                                      |       |        |
| **Members**                          |       |        |
| • Invite                             | ✓     | -      |
| • Member List Row Menu               | ✓     | ✓      |
| &emsp; • Change Role                    | ✓     | -      |
| &emsp; • Remove From Team               | ✓     | ✓      |
| &emsp; • Remove Other from Team         | ✓     | -      |
|                                      |       |        |
| **Audit Log**                        | ✓     | -      |
| **Team Settings**                    | ✓     | -      |

#### Changing roles

Owners can change roles by selecting "Change Role" on the members tab of a team.
The member selected will after submitting have a new role assigned with the new
authorization scheme.
