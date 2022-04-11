# Environment Variables

Environment Variables allow you to manage variables used in your Node-RED flows from the FlowForge application, you can read more on how to access enironment varibles inside Node-RED [in the Node-RED Docs](https://nodered.org/docs/user-guide/environment-variables)

An Environment Variable consists of a name and a value.

## Editing 
You can edit the environment variables for a project from the `Settings` tab of a project, select the `Environment` option from the right hand side.

Changes  will only take effect when the project is restarted.

If you modify the value of an Environment Variable within the flow that change will not show up within the FlowForge application, and it may not persist across restarts. 

## Template
The [Template](../concepts/#project-template) May contain some environment variables, some of these may be locked in that the value cannot be changed while others may allow their value to be edited for an individual project.

Variables set by the template cannot be deleted, however if they are editable the value can be set to blank

## Project
You can create additional variables for a single project by entering the name and value in the boxes at the bottom of the list and clicking the `+` button.

You can delete a project variable using the trash can icon.

The image below shows a project with 3 environment variables.

The first one `foo` is set by the template but the value `bar` is editable

The second one `locked` is set by the tempalte and the value is set to `true` is not editable

The third one `user` is set for the project, the value can be edited or the variable deleted

<img src="images/project-envar.png" width=300 />


