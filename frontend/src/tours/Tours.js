// eslint-disable-next-line n/no-extraneous-import
import { offset } from '@floating-ui/dom'
import { useShepherd } from 'vue-shepherd'

import Product from '../services/product.js'

// eslint-disable-next-line n/no-extraneous-import
import 'shepherd.js/dist/css/shepherd.css'
import './tour-theme.scss'

import store from '../store/index.js'

function create (id, tourJson, onCloseHook) {
    store.dispatch('ux/tours/activateTour', id)
    Product.capture('ff-tour-start', {
        tour_id: id
    })
    const tour = useShepherd({
        id,
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

    function onCancel () {
        const index = tour.steps.indexOf(tour.currentStep)
        store.dispatch('ux/tours/deactivateTour', id)
        store.dispatch('ux/tours/clearActiveTour')
        store.dispatch('ux/tours/withdrawTour')
        Product.capture('ff-tour-cancel', {
            tour_id: id,
            tour_step: index
        })
        if (onCloseHook) {
            onCloseHook()
        }
    }

    function onComplete () {
        store.dispatch('ux/tours/deactivateTour', id)
        store.dispatch('ux/tours/clearActiveTour')
        store.dispatch('ux/tours/withdrawTour')
        Product.capture('ff-tour-complete', {
            tour_id: id
        })
        if (onCloseHook) {
            onCloseHook()
        }
    }

    function onBack () {
        tour.back()
        const index = tour.steps.indexOf(tour.currentStep)
        Product.capture('ff-tour-step-back', {
            tour_id: id,
            tour_step: index
        })
    }

    function onNext () {
        tour.next()
        const index = tour.steps.indexOf(tour.currentStep)
        Product.capture('ff-tour-step-forward', {
            tour_id: id,
            tour_step: index
        })
    }

    tour.on('cancel', onCancel)
    tour.on('complete', onComplete)

    // loop over steps and add them to the tour
    const steps = tourJson.length

    tourJson.forEach((step, i) => {
        const buttons = []

        // if the step requires an interaction with the UI, don't add our own buttons
        if (!step.advanceOn) {
            // which secondary button do we need?
            if (i === 0) {
                buttons.push({
                    text: 'Exit',
                    action: tour.cancel,
                    secondary: true
                })
            } else {
                buttons.push({
                    text: 'Back',
                    action: onBack,
                    secondary: true
                })
            }

            // which primary button do we need?
            if (i !== steps - 1) {
                buttons.push({
                    text: 'Next',
                    action: onNext
                })
            } else {
                buttons.push({
                    text: 'Finish',
                    action: tour.complete
                })
            }
        }

        tour.addStep({
            ...step,
            buttons
        })
    })

    return tour
}

export default {
    create
}
