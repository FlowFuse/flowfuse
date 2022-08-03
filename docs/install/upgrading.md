# Upgrading FlowForge

If you are upgrading an existing FlowForge installation, this page will list any
particular requirements needed to upgrade to a given level.

Note that we do not support downgrading FlowForge to previous levels once an upgrade
has been performed.


### Upgrading to 0.7

The 0.7 release introduces the [ProjectType concept](../user/concepts.md#project-type).

After upgrading to 0.7, an administrator must perform the following tasks before
users will be able to create new projects:

1. Create a Project Type.
    1. On the Administrator Settings -> Project Types page, click 'Create project type'.
    2. Provide a name and description. If you have billing enabled, copy in the default
       Stripe Product/Price IDs from your runtime settings file.
    3. Click 'create'
2. Assign your existing stacks to that type
    1. On the Administrator Settings -> Stacks page, edit each existing stack via
       the drop-down menu in the table.
    2. As a one-time action, set its Project Type to the one just created.
    3. Click 'save'. This will update the stack *and* all existing projects to
       be associated with the new Project Type


### Upgrading to 0.8

With the 0.8 release we have updated the version of the SQLite3 node used by the localfs 
contianer driver. We are moving from v5.0.2 to v5.0.8.

There appears to be a clash with the bcrypt module when doing an inplace upgrade of the
SQLite3 node that gives an error similar to the following:

```
npm ERR! path /opt/share/projects/flowforge/sqlite-test/node_modules/sqlite3
npm ERR! command failed
npm ERR! command sh -c node-pre-gyp install --fallback-to-build
npm ERR! sh: line 1: node-pre-gyp: command not found
```

If you see this then the simplest fix is to remove the `node_modules` directory and reinstall
all the nodes from clean.