---
navTitle: DevOps Pipelines
---

# DevOps Pipelines


**Navigation**: `Team > Application > DevOps Pipelines`


<img src="./images/ui-devops-pipelines.jpg" width="100%" />


In FlowForge it is possible to configure a DevOps pipeline for your Node-RED instances.
DevOps Pipelines allow you to easily deploy from one instance to another, most
commonly used for having an unstable/experimental "Development" instance, and a more stable
"Production" instance.

The pipeline then allows you to move your full flow and configuration along from "Development"
to "Production" once it's ready.

In order to configure this in FlowForge, you can do this in your Application. Note you will need to have created
any Instances you wish to include in the Pipeline before being able to add them to a Pipeline.

## Creating a Pipeline

1. Select the Application you want to configure a Pipeline for.
2. Select the "DevOps Pipelines" tab
3. Select "Add Pipeline"
4. Name your pipeline appropriately (this can be changed later)
5. Select "Add Stage"
6. Define your Stage's name and the Instance associated to this Stage.
7. Click "Add Stage"
8. Repeat 5. - 7. for as many stages as you need.

_Note: You cannot currently insert a Stage into the middle of a Pipeline, only at the end._


## Running a Pipeline Stage

<img src="./images/ui-devops-run.png" width="100%" />

Each stage currently is deployed manually. To do so, click the "play" icon on the source stage. In the example above,
it will push from the "Development" stage to the "Production" stage.

**Environment Variables** - When pushing to a next stage, only your environment variable keys
will be copied over. Values must be set on the next Stage's Instance explicitly.

**Instance Settings** - None of your Instance Settings will be copied over (e.g. Editor, Palette or Security Settings).

This ensures a split between your staging environments.