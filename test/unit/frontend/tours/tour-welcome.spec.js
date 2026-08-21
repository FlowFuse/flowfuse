import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { onCancel } from '../../../../frontend/src/tours/tour-welcome.js'

function renderHostedInstanceTile () {
    document.body.innerHTML = `
        <div data-el="dashboard-section-hosted">
            <div class="instance-tile">
                <div class="actions"><a class="ff-btn">Open Editor</a></div>
            </div>
        </div>
    `

    return document.querySelector('.ff-btn')
}

describe('welcome tour onCancel', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
        document.body.innerHTML = ''
    })

    it('pulses the open editor button of the first hosted instance', () => {
        const editorButton = renderHostedInstanceTile()

        onCancel()
        vi.advanceTimersByTime(1000)

        expect(editorButton.classList.contains('pulse')).toBe(true)
    })

    it('does nothing when the team has no hosted instance to point at', () => {
        document.body.innerHTML = '<div data-el="dashboard-section-hosted"><div class="no-instances"><a>Create Instance</a></div></div>'

        expect(() => {
            onCancel()
            vi.advanceTimersByTime(1000)
        }).not.toThrow()
    })
})
