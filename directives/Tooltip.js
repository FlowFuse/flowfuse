const directive = {
    name: 'ff-tooltip',
    mounted: (el, binding) => {
        console.log(el, binding)
        if (el && binding) {
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
    }
}
export default directive
