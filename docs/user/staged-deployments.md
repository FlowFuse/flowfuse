# Staged Deployments

In FlowForge it is possible to configure a DevOps pipeline for your Node-RED instances.

1. Navigate to your Instance and click on the "Settings" option.
2. Select the "DevOps" tab
3. Select the relevant instance from the "Target Instance" dropdown that is the next stage in your pipeline.
For example, if your current instance is "My Application - Dev", your target instance could be
"My Application - Staging" or "My Application - Production"
4. Click the "Push to Stage" button, and confirm that you are happy to push over the relevant contents
to your target instance
5. You should see a confirmation alert to say this push has been successful.
6. From here, you can click the "View Target Instance" button, to navigate straight to the Instance
Overview of your Target Instance.
7. The Target Instance will be in an "importing" state for a short while, and will then automatically
restart itself with the relevant updates applied

**Environment Variables** - When pushing to a next stage, only your environment variable keys
will be copied over. Values must be set on your Target Instance explicitly.

**Instance Settings** - None of your Instance Settings will be copied over (e.g. Editor, Palette or Security Settings).

This ensures a split between your staging environments.