function renderTooltip (el, binding, vnode) {
    el.classList.add('ff-tooltip-container')

    let posClass = 'ff-tooltip-right'
    if (binding.arg) {
        posClass = 'ff-tooltip-' + binding.arg
    }

    const span = document.createElement('span')
    span.className = `ff-tooltip ${posClass}`
    span.innerHTML = binding.value

    el.appendChild(span)
}

const directive = {
    name: 'ff-tooltip',
    mounted: (el, binding) => {
        if (el && binding && binding.value) {
            renderTooltip(el, binding)
        }
    },
    updated (el, binding) {
        if (binding.value) {
            const tooltips = el.getElementsByClassName('ff-tooltip')
            if (tooltips.length) {
                // update existing tooltip
                tooltips[0].innerHTML = binding.value
            } else {
                // render a new tooltip
                renderTooltip(el, binding)
            }
        } else {
            // remove all tooltips
            const tooltips = el.getElementsByClassName('ff-tooltip')
            for (let i = 0; i < tooltips.length; i++) {
                tooltips[i].remove()
            }
        }
    }
}
export default directive
