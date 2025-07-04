import { defineComponent } from 'vue'

import Dialog from '../services/dialog.js'

export function useHubspotHelper () {
    const talkToSalesCalendarModal = (user, teamType) => {
        Dialog.show({
            header: `Talk to sales to upgrade to ${teamType.name}`,
            kind: 'primary',
            boxClass: 'ff-dialog-box--wide',
            confirmLabel: 'Close',
            canBeCanceled: false,
            is: {
                // eslint-disable-next-line vue/one-component-per-file
                component: defineComponent({
                    computed: {
                        url () {
                            const url = new URL('flowfuse/book-a-demo-call', 'https://meetings-eu1.hubspot.com')
                            url.searchParams.set('embed', true)
                            url.searchParams.set('firstName', user.name.split(' ')[0])
                            url.searchParams.set('lastName', user.name.split(' ')[1] ?? '')
                            url.searchParams.set('email', user.email)

                            return url.toString()
                        }
                    },
                    mounted () {
                        // Create and inject the HubSpot script tag
                        const script = document.createElement('script')
                        script.type = 'text/javascript'
                        script.src = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js'
                        script.async = true
                        document.body.appendChild(script)
                    },
                    template: `
                            <p>Unlock FlowFuse by upgrading to ${teamType.name}. Schedule a call to discuss your needs.</p>
                            <div class="meetings-iframe-container" :data-src="url"></div>
                          `
                })
            }
        })
    }

    return {
        talkToSalesCalendarModal
    }
}
