import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Product from '../../../../frontend/src/services/product.js'
import { useUxToursStore } from '../../../../frontend/src/stores/ux-tours.js'
import Tours from '../../../../frontend/src/tours/Tours.js'

vi.mock('../../../../frontend/src/services/product.js', () => ({
    default: { capture: vi.fn() }
}))

// shepherd positions its steps with floating-ui, which watches the target for
// resizes. jsdom has no ResizeObserver.
global.ResizeObserver = class {
    observe () {}
    unobserve () {}
    disconnect () {}
}

const STEPS = [
    { title: 'First', text: 'one' },
    { title: 'Second', text: 'two' },
    { id: 'final-step-with-hosted-instance', title: 'You are all set', text: 'three' }
]

// shepherd renders its steps asynchronously
const rendered = () => new Promise(resolve => setTimeout(resolve, 50))

// shepherd leaves the previous step in the DOM, marked hidden, so every query
// has to be scoped to the step that is actually on screen
function visibleStep () {
    return document.querySelector('.shepherd-element:not([hidden])')
}

function currentTitle () {
    return visibleStep()?.querySelector('.shepherd-title')?.textContent
}

function clickCloseIcon () {
    visibleStep().querySelector('.shepherd-cancel-icon').click()
}

function clickButton (text) {
    const button = [...visibleStep().querySelectorAll('.shepherd-button')]
        .find(candidate => candidate.textContent.trim() === text)
    button.click()
}

function pressEscape () {
    visibleStep().dispatchEvent(
        new KeyboardEvent('keydown', { keyCode: 27, key: 'Escape', bubbles: true })
    )
}

function captureOf (event) {
    return Product.capture.mock.calls.find(call => call[0] === event)?.[1]
}

describe('Tours.create', () => {
    let tour

    beforeEach(() => {
        setActivePinia(createPinia())
        Product.capture.mockClear()
    })

    afterEach(() => {
        if (tour?.isActive()) {
            tour.complete()
        }
        tour = undefined
        document.body.innerHTML = ''
    })

    describe('leaving the tour', () => {
        it('closes the tour when the close icon is used on the first step', async () => {
            tour = Tours.create('welcome', STEPS, vi.fn())
            tour.start()
            await rendered()
            expect(currentTitle()).toBe('First')

            clickCloseIcon()
            await rendered()

            expect(tour.isActive()).toBe(false)
            expect(document.querySelectorAll('.shepherd-element')).toHaveLength(0)
            expect(document.querySelectorAll('.shepherd-modal-overlay-container')).toHaveLength(0)
        })

        it('closes the tour when the close icon is used part way through', async () => {
            tour = Tours.create('welcome', STEPS, vi.fn())
            tour.start()
            await rendered()
            tour.next()
            await rendered()
            expect(currentTitle()).toBe('Second')

            clickCloseIcon()
            await rendered()

            expect(tour.isActive()).toBe(false)
            expect(document.querySelectorAll('.shepherd-element')).toHaveLength(0)
        })

        it('closes the tour when the Exit button on the first step is pressed', async () => {
            tour = Tours.create('welcome', STEPS, vi.fn())
            tour.start()
            await rendered()

            clickButton('Exit')
            await rendered()

            expect(tour.isActive()).toBe(false)
            expect(document.querySelectorAll('.shepherd-element')).toHaveLength(0)
        })

        it('closes the tour when escape is pressed', async () => {
            tour = Tours.create('welcome', STEPS, vi.fn())
            tour.start()
            await rendered()

            pressEscape()
            await rendered()

            expect(tour.isActive()).toBe(false)
            expect(document.querySelectorAll('.shepherd-element')).toHaveLength(0)
        })
    })

    describe('on cancel', () => {
        it('reports the step the user actually left on', async () => {
            tour = Tours.create('welcome', STEPS, vi.fn())
            tour.start()
            await rendered()
            tour.next()
            await rendered()

            clickCloseIcon()
            await rendered()

            expect(captureOf('ff-tour-cancel')).toEqual({ tour_id: 'welcome', tour_step: 1 })
        })

        it('clears tour state and runs the close hook once', async () => {
            const onClose = vi.fn()
            tour = Tours.create('welcome', STEPS, onClose)
            const store = useUxToursStore()
            tour.start()
            await rendered()

            clickCloseIcon()
            await rendered()

            expect(onClose).toHaveBeenCalledTimes(1)
            expect(store.tours.welcome).toBe(false)
            expect(store.activeTour).toBeNull()
            expect(store.shouldPresentTour).toBe(false)
        })

        it('runs the cancel hook so the tour can still flag a next step', async () => {
            const onCancel = vi.fn()
            tour = Tours.create('welcome', STEPS, vi.fn(), onCancel)
            tour.start()
            await rendered()

            clickCloseIcon()
            await rendered()

            expect(onCancel).toHaveBeenCalledTimes(1)
        })
    })

    describe('on complete', () => {
        it('runs the close hook but not the cancel hook', async () => {
            const onClose = vi.fn()
            const onCancel = vi.fn()
            tour = Tours.create('welcome', STEPS, onClose, onCancel)
            tour.start()
            await rendered()

            tour.complete()
            await rendered()

            expect(captureOf('ff-tour-complete')).toEqual({ tour_id: 'welcome' })
            expect(onClose).toHaveBeenCalledTimes(1)
            expect(onCancel).not.toHaveBeenCalled()
        })
    })
})
