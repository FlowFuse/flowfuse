export const id = 'welcome'

export default [
    {
        title: 'Welcome to FlowFuse!',
        text: "<p>Welcome to FlowFuse, the complete platform for building, managing and deploying your Node-RED applications.</p><p><b>Let's take a quick tour to get you started.</b></p>"
    },
    {
        title: 'Concept: Applications',
        text: '<p><b>This is your first Application in FlowFuse.</b></p><p>Applications help to organize your Node-RED Instances and other resources.</p>',
        attachTo: {
            element: 'li[data-el="application-item"]',
            on: 'bottom'
        },
        modalOverlayOpeningXOffset: 12
    },
    {
        title: 'Concept: Hosted Instances',
        text: '<p><b>Instances</b> refer to instances of Node-RED, managed through FlowFuse.</p><p><b>Hosted Instances</b> run in the same environment as FlowFuse.</p>',
        attachTo: {
            element: 'section[data-el="application-instances-none"]',
            on: 'bottom'
        }
    },
    {
        title: 'Concept: Remote Instances',
        text: '<p><b>Remote Instances</b> are Node-RED instances that are managed and deployed onto your own hardware.</p><p>This could be Instances running in factories or on a Raspberry Pi on your desk.</p>',
        attachTo: {
            element: 'section[data-el="application-devices-none"], section[data-el="application-devices"]',
            on: 'bottom'
        }
    },
    {
        title: 'Navigation: Application Summary',
        text: "<p>Here you can see a summary of the resources within your Application.</p><p>We've already had a quick look at the first two, but let's quickly scan over the others.</p>",
        attachTo: {
            element: 'div[data-el="application-summary"]',
            on: 'left'
        }
    },
    {
        title: 'Concept: Pipelines',
        text: '<p><b>DevOps Pipelines</b> help you push flows and configuration from one running Node-RED Instance to another.</p></p>This could be from a testing Instance to a production Instance, or from a single (test) Remote Instance out to thousands of (production) Remote Instances in your factory.</p>',
        attachTo: {
            element: 'a[data-nav="application-pipelines"] ',
            on: 'left'
        }
    },
    {
        title: 'Concept: Snapshots',
        text: '<p><b>Snapshots</b> are a point-in-time backup of a Node-RED Instance. They capture the flows, credentials and runtime settings.</p><p>Snapshots are used mostly for <b>Version Control</b> and in <b>Pipelines</b> where you can choose to roll out a <b>Snapshot</b> to <b>Instances</b> or <b>Device Group</b>.</p>',
        attachTo: {
            element: 'a[data-nav="application-snapshots"] ',
            on: 'left'
        }
    },
    {
        title: 'Concept: Device Groups',
        text: '<p><b>Device Groups</b> are collections of <b>Remote Instances</b> that can be used in <b>Pipelines</b> in order to deploy the same Node-RED flows out to multiple pieces of hardware in one-click.</p>',
        attachTo: {
            element: 'a[data-nav="application-device-groups"] ',
            on: 'left'
        }
    },
    {
        title: 'Setup Your First Remote Instance',
        text: "To get started, let's select your Application.</p>",
        attachTo: {
            element: 'a[data-action="view-application"]',
            on: 'bottom'
        },
        advanceOn: {
            selector: 'a[data-action="view-application"]',
            event: 'click'
        }
    }
]
