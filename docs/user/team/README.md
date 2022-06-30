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

| Role | Manage team members | Create and Delete Projects | Update flows in Projects | Manage Devices | View Audit Log | Update and Delete Team | Manage Billing  |
|---|---|---|---|---|
| Owner  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Member | - | - | ✓ | ✓ | ✓ | - | - |

#### Changing roles

Owners can change roles by selecting "Change Role" on the members tab of a team.
The member selected will after submitting have a new role assigned with the new
authorization scheme.
