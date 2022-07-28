# First-run Setup

Following a successful install, you will be able to access the platform to go
through the initial setup.

By default, you can access the platform at [http://localhost:3000](http://localhost:3000).

<img src="images/setup-01.png" width=300 />

## 1. Create an Administrator

The first user you create will be an Administrator. They will have full access
to the platform, be able to set platform-wide configuration and manage users and teams.

**Note**: with the 0.3 release, it is possible to reset your password *if* you have email
configured and enabled the `user:reset-password` option in Admin settings. Otherwise,
make sure you make a note of the password you set. We will provide tools to manage passwords
outside of the platform in a future release.

<img src="images/setup-02-user.png" width=300 />

## 2. Upload a license

FlowForge Community Edition is Open Source and can be used freely without a license.

If you have a FlowForge Enterprise Edition license you can upload it here.

<img src="images/setup-03-license.png" width=300 />

## 3. Platform Options

There are some runtime configuration options that can be configured at this stage.

<img src="images/setup-04-options.png" width=300 />

### Anonymous usage statistics

To help us understand how the project is being used, we gather high level
anonymous usage information from running instances.

The Administrator can opt-out of this feature.

## Login

Once you complete the setup, you will be able to login as the Administrator user
you created in the first step.

## Next Steps

Once logged in, there are three remaining tasks the Administrator must complete
before projects can be created

### 1. Create a Project Type

The Project Type provides a way to have different collections of Project Stacks
the user can choose from when creating a project.

They are managed on the `Project Types` section of Admin Settings.

When creating a Project Type you give it a name and description. If you have
billing enabled, you can associate a Stripe Product and Price ID with the type.

The `default stack` property lets you pick which stack should be used by default
for this project type. If you haven't created any stacks yet, this will be an
empty list, but you can update it later.

The `order` property controls how the project types are sorted when shown to the
user.


### 2. Create a Project Stack

The Project Stack defines a set of platform configuration options that will get
applied to each project when it is created.

They are managed on the `Stacks` section of Admin Settings.

When creating a Stack, the options available will depend on which deployment
option is being used. For more information, refer to the documentation of your
chosen deployment model.


 - [Local Stacks](./local/stacks.md)
 - [Docker Stacks](./docker/stacks.md)
 - Kubernetes Stacks - *coming soon*

### 2. Create a Project Template

A Project Template provides a default set of Node-RED settings, such as the path
the editor is served from and whether users can install new nodes.

The template currently provides a minimal set of options, but this will be
expanded in future releases.

