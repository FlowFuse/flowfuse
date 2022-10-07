const directive = {
    name: 'ff-tooltip',
    mounted: (el, binding) => {
        if (el && binding) {
            el.classList.add('ff-tooltip-container')
            let posClass = 'ff-tooltip-right'
            if (binding.arg) {
                posClass = 'ff-tooltip-' + binding.arg
            }
            const tooltipDOM = `<span class="ff-tooltip ${posClass}">${binding.value}</span>`
            el.innerHTML += tooltipDOM
        }
    }
}
export default directive
