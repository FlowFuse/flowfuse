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
        title: 'Hosted Instances Statistics at a Glance',
        text: '<p>Check the status of Hosted Instances in this team — <b>Running</b>, <b>Error</b>, or <b>Not Running</b> — all in one place.</p> ',
        attachTo: {
            element: '[data-el="dashboard-section-hosted"] .stats',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Recently Modified Hosted Instances',
        text: '<p>Quickly pick up where you left off. See your most recently modified Hosted Instances and jump straight into editing or managing them.</p>',
        attachTo: {
            element: '[data-el="dashboard-section-hosted"] .recently-modified',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Manage Hosted Instances Anytime',
        text: '<p>For more details and full control of your Hosted Instances, visit the <b>Hosted Instances</b> menu entry at any time.</p>',
        attachTo: {
            element: '[data-nav="team-instances"]',
            on: 'right'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Concept: Remote Instances',
        text: '<p><b>Remote Instances</b> are Node-RED instances that are managed and deployed <i>remotely</i>.</p><p>Whether hardware in factories or a Raspberry Pi on your desk, FlowFuse helps you manage hundreds of remote deployments.</p>',
        attachTo: {
            element: '[data-el="dashboard-section-remote"]',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Monitor Remote Instance Status',
        text: '<p>View the current state of your Remote Instances — see which are <b>Running</b>, which have <b>Errors</b>, and which are <b>Not Running</b>.</p>',
        attachTo: {
            element: '[data-el="dashboard-section-remote"] .stats',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Manage Recent Remote Activity',
        text: '<p>Access, edit, and manage the Remote Instances you updated most recently without searching for them.</p>',
        attachTo: {
            element: '[data-el="dashboard-section-remote"] .recently-modified',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Explore Remote Instances',
        text: '<p>For more details and full control of your Remote Instances, visit the <b>Remote Instances</b> menu entry at any time.</p>',
        attachTo: {
            element: '[data-nav="team-devices"]',
            on: 'right'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: 'Recent Team Activity',
        text: '<p>Keep track of your team’s latest actions. Quickly review what’s been happening across the team in one condensed view.</p>',
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
            <p>Quickly find Hosted Instances, Remote Instances, and Applications in your team.</p>
            <p>Click the search bar or press <b>Ctrl+K</b> (Windows/Linux) or <b>Cmd+K</b> (Mac) to open it.</p>
            <p>Navigate results using your keyboard for faster access.</p>
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
            <p>This should be enough to get things rolling. Your newly created Hosted Instance is ready — click the <b>Open Editor</b> button now to dive in and start building.</p>
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
