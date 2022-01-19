# First-run Setup

Following a successful install, you will be able to access the platform to go
through the initial setup.

By default, you can access the platform at [http://localhost:3000](http://localhost:3000).

![](images/setup-01.png)

## 1. Create an Administrator

The first user you create will be an Administrator. They will have full access
to the platform, be able to set platform-wide configuration and manage users and teams.

**Note**: with the 0.1.0 release, it is *not* possible to reset this user's password
outside of the platform. Make sure you make a note of the password you set. We will
provide tools to manage passwords outside of the platform in a future release.

![](images/setup-02-user.png)

## 2. Upload a license

The core of the platform is Open Source and can be used freely without a license.

In the future, optional features will be available that are not part of the Open
Source code base. Those features may require a license in order to enable and
use in production.

For now, you can skip this stage

![](images/setup-03-license.png)

## 3. Platform Options

There are some runtime configuration options that can be configured at this stage.

### Anonymous usage statistics

To help us understand how the project is being used, we plan to gather high level
anonymous usage information from running instances.

The Administrator can opt-out of this feature.

**This has not been implemented in the current release (0.1.0) - no data is gathered today**

We will clearly communicate in future releases what information is being gathered
and how.

## Login

Once you complete the setup, you will be able to login as the Administrator user
you created in the first step.
