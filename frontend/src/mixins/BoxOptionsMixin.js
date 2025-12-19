export default {
    props: {
        optionsOffsetTop: {
            type: Number,
            default: 0
        },
        alignRight: {
            type: Boolean,
            default: false
        },
        optionsTriggerGap: {
            type: Number,
            default: 5
        }
    },
    data () {
        return {
            _open: false,
            position: { top: 0, left: 0, width: 0, transform: '' }
        }
    },
    watch: {
        _open (isOpened) {
            console.log('staaate', isOpened)
            if (isOpened) {
                document.addEventListener('click', this.handleClickOutside)
                window.addEventListener('resize', this.updateItemsPosition)
                window.addEventListener('scroll', this.updateItemsPosition, true)
            } else {
                document.removeEventListener('click', this.handleClickOutside)
                window.removeEventListener('resize', this.updateItemsPosition)
                window.removeEventListener('scroll', this.updateItemsPosition, true)
            }
        }
    },
    computed: {
        triggerBoundingClientRect () {
            return this.$refs.trigger.$el.getBoundingClientRect()
        },
        menuItemsBoundingClientRect () {
            return this.$refs['menu-items'].$el.getBoundingClientRect()
        },
        areMenuItemsOverflowingRight () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.menuItemsBoundingClientRect.right > window.innerWidth
        },
        areMenuItemsOverflowingTop () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.menuItemsBoundingClientRect.top < 0
        },
        areMenuItemsOverflowingBottom () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.menuItemsBoundingClientRect.bottom > window.innerHeight
        },
        areMenuItemsOverflowingLeft () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.menuItemsBoundingClientRect.left < 0
        },
        isOverflowing () {
            return (
                this.areMenuItemsOverflowingRight ||
                this.areMenuItemsOverflowingTop ||
                this.areMenuItemsOverflowingBottom ||
                this.areMenuItemsOverflowingLeft
            )
        }
    },
    methods: {
        updateItemsPosition () {
            if (!this.$refs.trigger || !this.$refs.trigger.$el) return

            const rect = this.triggerBoundingClientRect

            // Start with default positioning (below trigger, left-aligned)
            let top = rect.bottom + window.scrollY + this.optionsOffsetTop
            let left = rect.left + window.scrollX
            const transform = ''

            // Wait for next tick to ensure menu is rendered, then check for overflow
            this.$nextTick(() => {
                if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return

                const menuRect = this.menuItemsBoundingClientRect
                const menuWidth = menuRect.width
                const menuHeight = menuRect.height

                // Check horizontal overflow
                if (this.areMenuItemsOverflowingRight) {
                // Align to right edge of trigger
                    left = rect.right + window.scrollX - menuWidth
                }

                if (this.areMenuItemsOverflowingLeft) {
                // Align to left edge of trigger
                    left = rect.left + window.scrollX
                }

                // Check vertical overflow
                if (this.areMenuItemsOverflowingBottom) {
                // Position above trigger instead of below
                    top = rect.top + window.scrollY - menuHeight - this.optionsTriggerGap
                }

                if (this.areMenuItemsOverflowingTop) {
                // Position below trigger
                    top = rect.bottom + window.scrollY + this.optionsOffsetTop
                }

                this.position = {
                    top,
                    left,
                    width: rect.width,
                    transform
                }
            })

            // Set initial position (will be adjusted if overflowing)
            this.position = {
                top,
                left,
                width: rect.width,
                transform
            }
        },
        syncOpenState (state) {
            this._open = state
            return state
        }
    }
}
