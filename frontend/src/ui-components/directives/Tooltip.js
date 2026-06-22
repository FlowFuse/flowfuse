const directive = {
    name: 'ff-tooltip',
    mounted (el, binding) {
        if (binding.value) {
            el.setAttribute('title', binding.value)
        }
    },
    updated (el, binding) {
        el.setAttribute('title', binding.value || '')
    }
}

export default directive
