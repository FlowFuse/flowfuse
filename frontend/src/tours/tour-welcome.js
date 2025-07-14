import { highlightElement } from '../composables/Ux.js'

export const id = 'welcome'
export default [
    {
        title: 'Welcome to FlowFuse!',
        text: '<p>Welcome to FlowFuse, the complete platform for building, managing and deploying your Node-RED applications.</p><p><b>Let\'s take a quick tour to get you started.</b></p>'
    },
    {
        title: 'Concept: Hosted Instances',
        text: '<p><b>Hosted Instances</b> refer to instances of Node-RED running on the <i>same</i> host as FlowFuse.</p>',
        attachTo: {
            element: '[data-el="dashboard-section-hosted"]',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Recently Modified Hosted Instances',
        text: '<p>Here, you can get quick access to your most recently modified Hosted Instances, jumping straight into editing or managing them.</p>',
        attachTo: {
            element: '[data-el="dashboard-section-hosted"] .recently-modified',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Concept: Remote Instances',
        text: '<p><b>Remote Instances</b> are Node-RED instances that are managed and deployed <i>remotely</i>, most commonly used for deploying Node-RED to the Edge.</p><p>Example include hardware in factories or a Raspberry Pi on your desk. FlowFuse can manage thousands of remote Node-RED deployments.</p>',
        attachTo: {
            element: '[data-el="dashboard-section-remote"]',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Manage Recent Remote Activity',
        text: '<p>Similarly, you can get quick access to your Remote Instances, with Remote Instances not fully setup, or in <b>Error</b> state getting flagged.</p>',
        attachTo: {
            element: '[data-el="dashboard-section-remote"] .recently-modified',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Recent Team Activity',
        text: '<p>FlowFuse keeps an Audit Log of all actions taken in the team so you can easily keep track of changes and actions taken by fellow team members.</p>',
        attachTo: {
            element: '[data-el="dashboard-section-audit"]',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Search Your Team',
        text: `
            <p>The quickest way to navigate FlowFuse is the global search bar. You can quickly find any Hosted Instances, Remote Instances, and Applications in your team.</p>
            <p>Click the search bar or press <b>Ctrl+K</b> (Windows/Linux) or <b>Cmd+K</b> (Mac) to open it and get searching across your resources.</p>
        `,
        attachTo: {
            element: '#global-search',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'You’re All Set',
        text: `
            <p>There is lots more on offer with FlowFuse, but let's dive into your newly created Hosted Instance and get building some flows. Click the <b>Open Editor</b> button now to dive in and start building.</p>
        `,
        attachTo: {
            element: '[data-el="dashboard-section-hosted"] .instance-tile:first-of-type', // adjust selector
            on: 'bottom'
        },
        when: {
            show () {
                const editorButton = document.querySelector('[data-el="dashboard-section-hosted"] .instance-tile:first-of-type .actions .ff-btn')
                highlightElement(editorButton, { count: 3, duration: 2000, animation: 'pulse' })
            }
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    }
]
