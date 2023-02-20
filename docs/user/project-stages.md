# Project Staged Deployments

In FlowForge it is possible to configure a DevOps pipeline for your Projects,
these are done by configuring "Stages" in the Settings of a given Project.

1. Navigate to your Project and click on the "Settings" option.
2. Select the "Stages" tab
3. Select the relevant project from the "Target Project" dropdown that is the next stage in your pipeline.
For example, if your current project is "My Project - Dev", your target project could be
"My Project - Staging" or "My Project - Production"
4. Click the "Push to Stage" button, and confirm that you are happy to push over the relevant contents
to your target project
5. You should see a confirmation alert to say this push has been successful.
6. From here, you can click the "View Target Project" button, to navigate straight to the Project
Overview of your Target Project.
7. The Target Project will be in an "importing" state for a short while, and will then automatically
restart itself with the relevant updates applied

**Environment Variables** - A point should be made, that when pushing to a next stage, only your environment variable keys
will be copied over. Values must be set on your Target Project explicitly.

**Project Settings** - None of your Project Settings will be moved over (e.g. Editor, Palette or Security Settings).
This ensures a split between your staging environments.