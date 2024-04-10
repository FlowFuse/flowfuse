---
navTitle: Adding Template Settings
---

# Adding Template Settings

Within FlowFuse, each Node-RED instance is created from a Template. The Template defines
a set of preconfigured options for the instance. This includes runtime settings - 
values that you would normally expect to set in your Node-RED settings.js file.

The Template also defines which of those options can be customised by individual instances.

This guide explains how to add a new Node-RED runtime option to the Template object
so that it can be customised and passed through to the underlying Node-RED settings.js file.

This is reasonably straightforward for simple boolean/string/numeric types.
For other types (objects/arrays) it gets more complicated and we don't currently
have good examples to follow.

For the 'simple' cases, the steps are:

1. Update the Frontend
   1. Pick a name for the setting, add it to the list of known settings and any
      validation logic that is needed
   2. Add it to the appropriate Template section
2. Update the runtime
   1. Add it to the known list of settings and any additional validation logic
3. Update the Launcher
   1. Update the template used to generate settings.js with the new property


## 1. Updating the Frontend

There are a set of views in the frontend used to present and edit templates. They
get used in two different ways:

 1. When creating/editing a template. 
    All options are available and there is a dropdown that lets the user set the
    policy on the setting (which controls whether an instance is allowed to override
    the setting)
 2. When editing instance settings.
    All options are shown, but only lets the user modify those that the template
    policy allows to be changed.

This reuse of the views saves a lot of code duplication, at the cost of some
complication in implementing it.


### 1.1 - Pick a name for the setting

The name should try to match its corresponding property in the Node-RED settings.js
file. Some thought should be made as to organisation of the properties.

1. Edit `frontend/src/pages/admin/Template/utils.js`
2. Add the new property name to the `templateFields` and `defaultTemplateValues` objects.
   Notice the names are flat strings with `_` used as a hierarchy separator... that
   will make more sense if you're looking at the file.
3. If the value needs any sort of validation, add it to `templateValidators` in the
   same file.

### 1.2 - Add it to the appropriate Template section

Currently there are:

 - Editor
 - Palette
 - Environment - a special case that is unlikely to get other options added

These each lives in their own file under `frontend/src/pages/admin/Template/sections/`.

Pick an existing setting that most closely matches the setting you want to add 
(ie checkbox or text input), and copy its entry to the appropriate place.

Make sure you update *all* of the references of the copied property name to your
new property name.


## 2. Updating the Runtime

### 2.1 - Adding it to the known list

1. Edit `forge/db/controllers/ProjectTemplate.js` to add the new property to the
   list of known settings.

2. In that same file, update the `validateSettings` function with any additional
   validation or data cleansing needed.


## 3. Update nr-launcher

In the `flowforge-nr-launcher` repo...

1. Edit `lib/runtimeSettings.js` to include the new setting in the generate settings.js
   file. Note that you must handle the case where the new setting is not present - 
   either by applying a sensible default, or omitting the value.
