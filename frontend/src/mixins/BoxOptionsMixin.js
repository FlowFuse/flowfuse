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
        },
        position (value) {
            console.log('position', value)
        }
    },
    computed: {
        areMenuItemsOverflowingRight () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.$refs['menu-items'].$el.getBoundingClientRect().right > window.innerWidth
        },
        areMenuItemsOverflowingTop () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.$refs['menu-items'].$el.getBoundingClientRect().top < 0
        },
        areMenuItemsOverflowingBottom () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.$refs['menu-items'].$el.getBoundingClientRect().bottom > window.innerHeight
        },
        areMenuItemsOverflowingLeft () {
            if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) return false
            return this.$refs['menu-items'].$el.getBoundingClientRect().left < 0
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

            const triggerRect = this.$refs.trigger.$el.getBoundingClientRect()

            // Use viewport-relative coordinates (no window.scrollX/Y)
            let triggerTop = triggerRect.bottom + this.optionsOffsetTop
            let triggerLeft = triggerRect.left
            const transform = ''

            // Set initial position immediately
            this.position = {
                top: triggerTop,
                left: triggerLeft,
                width: triggerRect.width,
                transform
            }

            // Wait for next tick to ensure menu is rendered, then check for overflow
            this.$nextTick(() => {
                if (!this.$refs['menu-items'] || !this.$refs['menu-items'].$el) {
                    return
                }

                const menuRect = this.$refs['menu-items'].$el.getBoundingClientRect()
                const menuWidth = menuRect.width
                const menuHeight = menuRect.height

                // Re-calculate based on actual dimensions
                if (this.areMenuItemsOverflowingRight) {
                    // Align to right edge of trigger
                    triggerLeft = triggerRect.right - menuWidth
                }

                if (this.areMenuItemsOverflowingLeft) {
                    // Align to left edge of trigger
                    triggerLeft = triggerRect.left
                }

                // Check vertical overflow
                if (this.areMenuItemsOverflowingBottom) {
                    // Position above trigger instead of below
                    triggerTop = triggerRect.top - menuHeight - this.optionsTriggerGap
                }

                // Only update if something actually changed
                if (triggerLeft !== this.position.left || triggerTop !== this.position.top) {
                    this.position = {
                        top: triggerTop,
                        left: triggerLeft,
                        width: triggerRect.width,
                        transform
                    }
                }
            })
        },
        syncOpenState (state) {
            this._open = state
            return state
        }
    }
}
