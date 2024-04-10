---
navTitle: Working with Feature Flags
---

When adding features to the platform it is sometimes a requirement to be able to
restrict the feature to licensed platforms, and furthermore to certain types of team
on the platform.

Most typically this will be a feature that should only be available to the `Team`
or `Enterprise` tiers on FlowFuse Cloud.

This is a quick guide for how to add a feature flag - both at the platform-wide
level and against individual `TeamTypes`.

Feature flag names should use `camelCase`.

### Add a platform-wide feature flag

All licensable features should set a platform-wide feature flag to indicate
the feature is available.

```
app.config.features.register('featureFlagName', true)
```

[Here](https://github.com/FlowFuse/flowfuse/blob/0335c9056019ff9987d97f3ad3f18675de1c2422/forge/ee/lib/ha/index.js#L6) is
an example of how the HA feature sets its platform-wide flag.


### Add a team type feature flag

The feature flag is set by an admin user via [`TeamTypeEditDialog.vue`](https://github.com/FlowFuse/flowfuse/blob/0335c9056019ff9987d97f3ad3f18675de1c2422/frontend/src/pages/admin/TeamTypes/dialogs/TeamTypeEditDialog.vue).


1. Add an entry to the existing list of feature flags [here](https://github.com/FlowFuse/flowfuse/blob/0335c9056019ff9987d97f3ad3f18675de1c2422/frontend/src/pages/admin/TeamTypes/dialogs/TeamTypeEditDialog.vue#L73-L85).
2. Add a check to ensure the right default value is applied [here](https://github.com/FlowFuse/flowfuse/blob/0335c9056019ff9987d97f3ad3f18675de1c2422/frontend/src/pages/admin/TeamTypes/dialogs/TeamTypeEditDialog.vue#L172-L174). Any new feature should default to `false` so it can then be selectively enabled.

### Using the feature flags - runtime side

Platform-wide feature flags can be checked using:

```
const isFeatureEnabledOnPlatform = app.config.features.enabled('featureFlagName')

```

`TeamType` feature flags can be checked using the `getFeatureProperty` function
of the `TeamType` model:


```
// myTeamType is an instance of `TeamType`
const isFeatureEnabledForTeamType = myTeamType.getFeatureProperty('featureFlagName', false)
```

The first arg is the name of the feature flag, the second arg is the default value
if the feature flag is otherwise unset. As mentioned above, any new feature should
default to `false`.

[Here](https://github.com/FlowFuse/flowfuse/blob/0335c9056019ff9987d97f3ad3f18675de1c2422/forge/ee/routes/sharedLibrary/index.js#L22) is an example of this in action.

### Using the feature flag - frontend

In the frontend, platform-wide feature flags can be checked against
the `features` property of the `account` store.

TeamType feature flags can be checked against `team.type.properties.features.featureFlagName`.

[Here](https://github.com/FlowFuse/flowfuse/blob/0335c9056019ff9987d97f3ad3f18675de1c2422/frontend/src/pages/application/DeviceGroups.vue#L135-L146) is an example of how we combine these two things:

```
    computed: {
        ...mapState('account', ['features']),
        featureEnabledForTeam () {
            return !!this.team.type.properties.features?.deviceGroups
        },
        featureEnabledForPlatform () {
            return this.features.deviceGroups
        },
        featureEnabled () {
            return this.featureEnabledForTeam && this.featureEnabledForPlatform
        }
    },
```

This allows the UI to distinguish between a feature being unavailable because the platform
is not licensed for it, and a feature being unavailable for the current team type.

This allows different messages to be displayed with the most appropriate call to action.

The `EmptyState` component has support for this - see [here](https://github.com/FlowFuse/flowfuse/blob/0335c9056019ff9987d97f3ad3f18675de1c2422/frontend/src/pages/application/DeviceGroups.vue#L29)
for how that is applied.