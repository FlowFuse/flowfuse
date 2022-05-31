# Changing the Stack
[Project Stacks](concepts#project-stack) define various aspects of how the project is run.

Notably the Version of Node-RED which a project uses, you can now change the stack of an existing project which allows you to upgrade the version of Node-RED

**Note:** An administrator must make a specific version of Node-RED available by creating the relevant stack

## How to Change Stack
Before changing a stack you should ensure that you have a backup of your data from Node-RED and that there are no active workflows, switching the stack will restart the project and involve a few seconds of downtime.


- From the project page  select the `Settings` tab then  the `Danger` section.
- Click the `Change Project Stack` Button
- When prompted select your new stack from the available list 
- Click `Change Stack`

Your project will now restart on the new stack


