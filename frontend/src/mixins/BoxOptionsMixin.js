export default {
    data () {
        return {
            open: false,
            position: { top: 0, left: 0, width: 0 }
        }
    },
    mounted () {
        document.addEventListener('click', this.handleClickOutside)
        window.addEventListener('resize', this.updatePosition)
        window.addEventListener('scroll', this.updatePosition, true)
    },
    beforeUnmount () {
        document.removeEventListener('click', this.handleClickOutside)
        window.removeEventListener('resize', this.updatePosition)
        window.removeEventListener('scroll', this.updatePosition, true)
    },
    methods: {
        updatePosition () {
            if (!this.$refs.trigger || !this.$refs.trigger.$el) return
            const rect = this.$refs.trigger.$el.getBoundingClientRect()
            this.position = {
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            }
        },
        handleClickOutside (e) {
            if (
                this.$refs.trigger.value &&
                this.$refs.trigger.value.$el &&
                !this.$refs.trigger.value.$el.contains(e.target)
            ) {
                close()
            }
        },
        close () {
            this.open = false
        }
    }
}
