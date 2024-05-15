---
navTitle: Installing a license
---

## Upgrading to FlowFuse Enterprise

For self-managed FlowFuse installations without a license you can unlock more
features with a enterprise license. As an admin a license can be uploaded to
FlowFuse in the admin panel, under the settings tab. When a license is uploaded
a restart of the `forge` app is required.

After the forge application has restarted, the Node-RED runtimes need to be
updated to leverage these features. As restarting Node-RED might need to be
coordinated, FlowFuse will not automatically restart all instances.

## Enabling FlowFuse User Authentication for @flowfuse/node-red-dashboard

Included with the Enterprise licensed FlowFuse is the ability to use 
FlowFuse Authentication to control access to Dashboards and to have the 
user information passed to the Node-RED Flow.

This is enabled by installing a Node-RED plugin `@flowfuse/node-red-dashboard-2-user-addon`.
To install this plugin you will require a npm authentication token. To request
one please contact <a href="mailto:support@flowfuse.com?subject=Dashboard 2 User addon">support@flowfuse.com</a>.

Once you have been supplied with a authentication token please follow these steps:

1. Under the Admin Settings page, open the Templates tab and edit the template
2. On the Palette page of the Template settings add the following to the "Node Catalogues" list `https://catalog.flowfuse.com/catalogue.json`
3. In the "NPM configuration file" section you will need to add
    ```
    //registry.npmjs.org/:_authToken=<npm_auth_token>
    ```
    replacing `<npm_auth_token>` with the token supplied earlier
4. Click on the "Save changes" button
5. Any existing Node-RED instances will need to be restarted to pick up the changes to the template
6. Once restarted you should be able to install the `@flowfuse/node-red-dashboard-2-user-addon` from the Palette Manage menu in the Node-RED instance.
