export const id = 'first-device'

export default [
    // {
    //     title: 'Application: Remote Instances',
    //     text: '<p>Here we can manage the <b>Remote Instances</b> managed by our Application.</p>',
    //     attachTo: {
    //         element: 'a[data-nav="application-devices-overview"]',
    //         on: 'bottom'
    //     },
    //     modalOverlayOpeningPadding: 12,
    //     beforeShowPromise: () => {
    //         return new Promise((resolve) => {
    //             const interval = setInterval(() => {
    //                 if (document.querySelector('a[data-nav="application-devices-overview"]')) {
    //                     clearInterval(interval)
    //                     resolve()
    //                 }
    //             }, 100)
    //         })
    //     }
    // },
    {
        title: 'Add Remote Instance',
        text: "<p>Let's add our first Remote Instance to FlowFuse.</p><p>We have two steps to complete here:</p><ol class=\"list-disc pl-4 space-y-2 mb-2\"><li>Add your <b>Remote Instance</b> to FlowFuse.</li><li>Install and run the <b>FlowFuse Device Agent</b> on the hardware where you want the Instance to run.</li></ol><p>After this, you'll be able to update and deploy flows to your hardware from anywhere in the world.",
        attachTo: {
            element: 'button[data-action="register-device"]',
            on: 'top'
        },
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6,
        noActions: true,
        advanceOn: {
            selector: 'button[data-action="register-device"]',
            event: 'click'
        },
        beforeShowPromise: () => {
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (document.querySelector('button[data-action="register-device"]')) {
                        clearInterval(interval)
                        resolve()
                    }
                }, 100)
            })
        }
    },
    {
        title: 'Add Details',
        text: '<p>Define a name and type for your new <b>Remote Instance</b>.</p><ul class="list-disc pl-4 space-y-2"><li><b>Name:</b> A Unique identifier for your Remote Instance</li><li><b>Type:</b> Use this field to make your Instance more easily identifiable, and group together similar Instances.</li></ul>',
        attachTo: {
            element: 'div[data-el="team-device-create-dialog"] .ff-dialog-box',
            on: 'bottom'
        },
        classes: 'shepherd-hidden',
        advanceOn: {
            selector: 'div[data-el="team-device-create-dialog"] .ff-dialog-box button[data-action="dialog-confirm"]',
            event: 'click'
        }
    },
    {
        title: 'Connect Your Remote Instance',
        text: "<p>Now you can install the FlowFuse Device Agent onto your hardware, e.g. your own laptop, Raspberry Pi or PLC. Use this command to connect the Device Agent to FlowFuse.</p><p>Once you've done this, you'll have a remotely managed Node-RED Instance all setup and running!</p>",
        attachTo: {
            element: '[data-el="team-device-config-dialog"].ff-dialog-container--open .ff-dialog-box',
            on: 'bottom'
        },
        classes: 'shepherd-hidden',
        advanceOn: {
            selector: '[data-el="team-device-config-dialog"].ff-dialog-container--open .ff-dialog-actions button',
            event: 'click'
        },
        beforeShowPromise: () => {
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (document.querySelector('[data-el="team-device-config-dialog"].ff-dialog-container--open .ff-dialog-actions button')) {
                        clearInterval(interval)
                        resolve()
                    }
                }, 100)
            })
        }
    }]
