// eslint-disable-next-line n/no-extraneous-import
import 'shepherd.js/dist/css/shepherd.css'
import './tour-theme.scss'

// eslint-disable-next-line n/no-extraneous-import
import { offset } from '@floating-ui/dom'

import TourWelcome from './tour-welcome.json'

export default {
    data () {
        return {
            tour: null
        }
    },

    methods: {
        createTour () {
            this.tour = this.$shepherd({
                useModalOverlay: true,
                defaultStepOptions: {
                    arrow: true,
                    classes: 'shepherd-theme-ff',
                    scrollTo: false,
                    cancelIcon: {
                        enabled: true
                    },
                    floatingUIOptions: {
                        middleware: [offset({ mainAxis: 12, crossAxis: 0 })]
                    }
                }
            })

            // loop over steps and add them to the tour
            const steps = TourWelcome.length

            TourWelcome.forEach((step, i) => {
                const buttons = []

                // which secondary button do we need?
                if (i === 0) {
                    buttons.push({
                        text: 'Exit',
                        action: this.tour.cancel,
                        secondary: true
                    })
                } else {
                    buttons.push({
                        text: 'Back',
                        action: this.tour.back,
                        secondary: true
                    })
                }

                // which primary button do we need?
                if (i !== steps - 1) {
                    buttons.push({
                        text: 'Next',
                        action: this.tour.next
                    })
                } else {
                    buttons.push({
                        text: 'Finish',
                        action: this.tour.complete
                    })
                }

                this.tour.addStep({
                    ...step,
                    buttons
                })
            })
        }
    },

    mounted () {
        this.createTour()
        this.tour.start()
    }
}
