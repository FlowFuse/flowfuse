import { debounce } from '../../utils/eventHandling.js'

function renderTooltip (el, binding) {
    el.classList.add('ff-tooltip-container')

    let posClass = 'ff-tooltip-right'
    if (binding.arg) {
        posClass = 'ff-tooltip-' + binding.arg
    }

    let tooltip = null
    let tooltipTimeout = null
    let isTooltipVisible = false

    const createTooltip = () => {
        if (isTooltipVisible) return

        tooltip = document.createElement('div')
        tooltip.className = `ff-tooltip ${posClass}`
        tooltip.innerHTML = binding.value
        tooltip.style.position = 'absolute'
        tooltip.style.zIndex = '9999' // Ensure it stays above other elements

        document.body.appendChild(tooltip)

        // Position the tooltip relative to the element
        const rect = el.getBoundingClientRect()
        switch (posClass) {
        case 'ff-tooltip-top':
            tooltip.style.left = (rect.left + rect.width / 2) + 'px'
            tooltip.style.top = rect.top - (tooltip.offsetHeight + 15) + 'px'
            break
        case 'ff-tooltip-bottom':
            tooltip.style.left = (rect.left + rect.width / 2) + 'px'
            tooltip.style.top = (rect.bottom + 15) + 'px'
            break
        case 'ff-tooltip-left':
            tooltip.style.left = rect.left - (tooltip.offsetWidth + 15) + 'px'
            tooltip.style.top = (rect.top + rect.height / 2 - tooltip.offsetHeight / 2) + 'px'
            break
        case 'ff-tooltip-right':
        default:
            tooltip.style.left = (rect.right + 15) + 'px'
            tooltip.style.top = (rect.top + rect.height / 2 - tooltip.offsetHeight / 2) + 'px'
        }

        // Use requestAnimationFrame to allow the DOM to render first
        requestAnimationFrame(() => {
            tooltip.classList.add('ff-tooltip--visible')
            isTooltipVisible = true
        })
    }

    const removeTooltip = () => {
        if (!isTooltipVisible) return

        if (tooltip) {
            // Use requestAnimationFrame to allow the DOM to render first
            requestAnimationFrame(() => {
                tooltip.classList.remove('ff-tooltip--visible')

                setTimeout(() => {
                    tooltip?.remove()
                    tooltip = null
                    isTooltipVisible = false
                }, 500)
            })
        }
    }

    const onMouseEnter = () => {
        clearTimeout(tooltipTimeout)
        tooltipTimeout = setTimeout(createTooltip, 150)
    }

    const onMouseLeave = () => {
        clearTimeout(tooltipTimeout)
        tooltipTimeout = setTimeout(removeTooltip, 250)
    }

    el.addEventListener('mouseenter', debounce(onMouseEnter, 150))
    el.addEventListener('mouseleave', debounce(onMouseLeave, 150))

    // Store references for cleanup
    el._tooltip = { onMouseEnter, onMouseLeave, removeTooltip }
}

const directive = {
    name: 'ff-tooltip',
    mounted (el, binding) {
        if (!binding.value) {
            return
        }

        if (el && binding && binding.value) {
            renderTooltip(el, binding)
        }
    },
    updated (el, binding) {
        if (binding.value) {
            // Replace tooltip content if already present
            const tooltip = document.querySelector('.ff-tooltip')
            if (tooltip) {
                tooltip.innerHTML = binding.value
            } else {
                renderTooltip(el, binding)
            }
        } else {
            el._tooltip?.removeTooltip()
        }
    },
    unmounted (el) {
        el._tooltip?.removeTooltip()
        el.removeEventListener('mouseenter', el._tooltip?.onMouseEnter)
        el.removeEventListener('mouseleave', el._tooltip?.onMouseLeave)
        delete el._tooltip
    }
}

export default directive
