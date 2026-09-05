import { highlightElement } from '../composables/Ux.js'
import { t } from '../i18n.js'

export const id = 'welcome'
export default [
    {
        title: t('ui.welcomeToFlowfuse'),
        text: t('ui.tourWelcomeIntro')
    },
    {
        title: t('ui.conceptHostedInstances'),
        text: t('ui.tourHostedInstances'),
        attachTo: {
            element: '[data-el="dashboard-section-hosted"]',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: t('ui.recentlyModifiedHostedInstances'),
        text: t('ui.tourRecentlyModified'),
        attachTo: {
            element: '[data-el="dashboard-section-hosted"] .recently-modified',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: t('ui.conceptRemoteInstances'),
        text: t('ui.tourRemoteInstances'),
        attachTo: {
            element: '[data-el="dashboard-section-remote"]',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: t('ui.manageRecentRemoteActivity'),
        text: t('ui.tourRemoteQuickAccess'),
        attachTo: {
            element: '[data-el="dashboard-section-remote"] .recently-modified',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: t('ui.recentTeamActivity'),
        text: t('ui.tourAuditLog'),
        attachTo: {
            element: '[data-el="dashboard-section-audit"]',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        title: t('ui.searchYourTeam'),
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
    { // last step for teams that already have an instance created when signing up
        id: 'final-step-with-hosted-instance',
        title: 'You’re All Set',
        text: `
            <p>There is lots more on offer with FlowFuse, but let's dive into your newly created Hosted Instance and get building some flows. Click the <b>Open Editor</b> button now to dive in and start building.</p>
        `,
        attachTo: {
            element: '[data-el="dashboard-section-hosted"] .instance-tile:first-of-type',
            on: 'bottom'
        },
        when: {
            show () {
                const target = document.querySelector('[data-el="dashboard-section-hosted"] .instance-tile:first-of-type')
                if (!target) {
                    // skip to the next step if we don't have instances created
                    return this.tour.next()
                } else {
                    this.updateStepOptions({
                        buttons: [
                            {
                                text: t('ui.back'),
                                action: this.tour.back,
                                classes: 'shepherd-button-secondary'
                            },
                            {
                                text: t('ui.finish'),
                                action: this.tour.complete,
                                classes: 'shepherd-button-primary'
                            }
                        ]
                    })
                }

                const editorButton = document.querySelector('[data-el="dashboard-section-hosted"] .instance-tile:first-of-type .actions .ff-btn')
                highlightElement(editorButton, { count: 3, duration: 2000, animation: 'pulse' })
            }
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    },
    {
        id: 'final-step-without-hosted-instance',
        title: 'You’re All Set',
        text: `
            <p>There’s much more you can do with FlowFuse, but first, let’s get you started by creating your Hosted Instance. Click the <b>Create Instance</b> button to set one up and begin building your flows.</p>
        `,
        attachTo: {
            element: '[data-el="dashboard-section-hosted"] .no-instances a',
            on: 'bottom'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6
    }
]
