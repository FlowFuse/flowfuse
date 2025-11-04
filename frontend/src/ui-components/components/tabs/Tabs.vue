<template>
    <div class="ff-tabs-wrapper" :class="{ 'ff-tabs-wrapper--overflow-enabled': enableOverflow }">
        <button
            v-if="enableOverflow && hasHiddenLeft"
            class="ff-tabs__overflow-button ff-tabs__overflow-button--left"
            @click.stop="toggleLeftDropdown"
            aria-label="Show hidden tabs on the left"
        >
            <ChevronLeftIcon class="ff-icon" />
            <ChevronLeftIcon class="ff-icon ff-icon-second" />
        </button>

        <div
            ref="scrollContainer"
            class="ff-tabs__scroll-container"
            :class="{ 'ff-tabs__scroll-container--overflow': enableOverflow }"
            @scroll="handleScroll"
        >
            <ul class="ff-tabs" :class="'ff-tabs--' + orientation">
                <router-link
                    v-for="(tab, $index) in scopedTabs"
                    :key="tab.label"
                    :ref="'tab-' + $index"
                    data-el="ff-tab"
                    class="ff-tab-option transition-fade--color"
                    :to="tab.to"
                    :data-nav="tab.tag"
                    @click="selectTab($index)"
                >
                    <img v-if="tab.icon" :src="tab.icon" class="ff-tab-icon" alt="">
                    <span class="ff-tab-label">{{ tab.label }}</span>
                    <span v-if="tab.featureUnavailable" v-ff-tooltip="'Not available in this Team Tier'" data-el="premium-feature">
                        <SparklesIcon class="ff-icon transition-fade--color hollow" style="stroke-width: 1;" />
                    </span>
                </router-link>
            </ul>
        </div>

        <button
            v-if="enableOverflow && hasHiddenRight"
            class="ff-tabs__overflow-button ff-tabs__overflow-button--right"
            @click.stop="toggleRightDropdown"
            aria-label="Show hidden tabs on the right"
        >
            <ChevronRightIcon class="ff-icon" />
            <ChevronRightIcon class="ff-icon ff-icon-second" />
        </button>

        <!-- Left dropdown -->
        <div v-if="showLeftDropdown" v-click-outside="closeLeftDropdown" class="ff-tabs__dropdown ff-tabs__dropdown--left">
            <router-link
                v-for="(tab, $index) in hiddenLeftTabs"
                :key="'left-' + tab.label"
                class="ff-tabs__dropdown-item"
                :to="tab.to"
                @click="onDropdownItemClick(tab)"
            >
                <img v-if="tab.icon" :src="tab.icon" class="ff-tab-icon" alt="">
                <span class="ff-tab-label">{{ tab.label }}</span>
            </router-link>
        </div>

        <!-- Right dropdown -->
        <div v-if="showRightDropdown" v-click-outside="closeRightDropdown" class="ff-tabs__dropdown ff-tabs__dropdown--right">
            <router-link
                v-for="(tab, $index) in hiddenRightTabs"
                :key="'right-' + tab.label"
                class="ff-tabs__dropdown-item"
                :to="tab.to"
                @click="onDropdownItemClick(tab)"
            >
                <img v-if="tab.icon" :src="tab.icon" class="ff-tab-icon" alt="">
                <span class="ff-tab-label">{{ tab.label }}</span>
            </router-link>
        </div>
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/outline'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-tabs',
    components: {
        SparklesIcon,
        ChevronLeftIcon,
        ChevronRightIcon
    },
    directives: {
        clickOutside: {
            mounted (el, binding) {
                el.clickOutsideEvent = function (event) {
                    if (!(el === event.target || el.contains(event.target))) {
                        binding.value(event)
                    }
                }
                document.addEventListener('click', el.clickOutsideEvent)
            },
            unmounted (el) {
                document.removeEventListener('click', el.clickOutsideEvent)
            }
        }
    },
    props: {
        orientation: {
            default: 'horizontal',
            type: String
        },
        tabs: {
            default: () => [],
            type: Array
        },
        enableOverflow: {
            default: false,
            type: Boolean
        }
    },
    emits: ['tab-selected'],
    data () {
        return {
            selectedIndex: -1,
            visibleTabs: [],
            showLeftDropdown: false,
            showRightDropdown: false,
            resizeObserver: null,
            intersectionObserver: null,
            wheelScrollHandler: null
        }
    },
    computed: {
        scopedTabs () {
            return this.tabs.filter(tab => {
                if (Object.prototype.hasOwnProperty.call(tab, 'hidden')) {
                    return !tab.hidden
                }
                return true
            })
        },
        hasHiddenLeft () {
            if (!this.enableOverflow || this.orientation !== 'horizontal') return false
            return this.hiddenLeftTabs.length > 0
        },
        hasHiddenRight () {
            if (!this.enableOverflow || this.orientation !== 'horizontal') return false
            return this.hiddenRightTabs.length > 0
        },
        hiddenLeftTabs () {
            if (!this.enableOverflow) return []
            return this.scopedTabs.filter((tab, index) => {
                return !this.visibleTabs.includes(index) && this.isTabOnLeft(index)
            })
        },
        hiddenRightTabs () {
            if (!this.enableOverflow) return []
            return this.scopedTabs.filter((tab, index) => {
                return !this.visibleTabs.includes(index) && !this.isTabOnLeft(index)
            })
        }
    },
    mounted () {
        if (this.enableOverflow && this.orientation === 'horizontal') {
            this.$nextTick(() => {
                this.initOverflowDetection()
                this.initWheelScroll()
            })
        }
    },
    beforeUnmount () {
        this.cleanupObservers()
        this.cleanupWheelScroll()
    },
    methods: {
        selectTab (i) {
            this.selectedIndex = i

            // loop over all the tabs
            this.scopedTabs?.forEach((tab, index) => {
                tab.isActive = (index === i)
                if (tab.isActive) {
                    this.$emit('tab-selected', tab)
                    if (tab.to) {
                        this.$router.push(tab.to)
                    }
                }
            })
        },
        initOverflowDetection () {
            const container = this.$refs.scrollContainer
            if (!container) return

            // Use IntersectionObserver to detect which tabs are visible
            const options = {
                root: container,
                threshold: 0.95 // Tab must be 95% visible
            }

            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const tabElement = entry.target
                    const tabIndex = parseInt(tabElement.getAttribute('data-tab-index'))

                    if (entry.isIntersecting) {
                        if (!this.visibleTabs.includes(tabIndex)) {
                            this.visibleTabs.push(tabIndex)
                        }
                    } else {
                        const index = this.visibleTabs.indexOf(tabIndex)
                        if (index > -1) {
                            this.visibleTabs.splice(index, 1)
                        }
                    }
                })
            }, options)

            // Observe all tab elements
            const tabElements = container.querySelectorAll('.ff-tab-option')
            tabElements.forEach((tabElement, index) => {
                tabElement.setAttribute('data-tab-index', index)
                this.intersectionObserver.observe(tabElement)
            })

            // Also use ResizeObserver to re-check on container resize
            this.resizeObserver = new ResizeObserver(() => {
                this.updateVisibleTabs()
            })
            this.resizeObserver.observe(container)

            // Initial check
            this.updateVisibleTabs()
        },
        updateVisibleTabs () {
            const container = this.$refs.scrollContainer
            if (!container) return

            const containerRect = container.getBoundingClientRect()
            const tabElements = container.querySelectorAll('.ff-tab-option')

            this.visibleTabs = []
            tabElements.forEach((tabElement, index) => {
                const tabRect = tabElement.getBoundingClientRect()
                // Check if tab is mostly visible within container
                const isVisible = tabRect.left >= containerRect.left - 5 &&
                                  tabRect.right <= containerRect.right + 5
                if (isVisible) {
                    this.visibleTabs.push(index)
                }
            })

        },
        handleScroll () {
            if (this.enableOverflow) {
                this.updateVisibleTabs()
            }
        },
        isTabOnLeft (tabIndex) {
            // Determine if a tab is on the left side (before first visible tab)
            if (this.visibleTabs.length === 0) {
                // If no tabs are visible, check scroll position
                const container = this.$refs.scrollContainer
                if (!container) return false
                return tabIndex < this.scopedTabs.length / 2
            }

            const firstVisibleIndex = Math.min(...this.visibleTabs)
            // Tab is on the left if its index is before the first visible tab
            return tabIndex < firstVisibleIndex
        },
        toggleLeftDropdown () {
            this.showLeftDropdown = !this.showLeftDropdown
            this.showRightDropdown = false
        },
        toggleRightDropdown () {
            this.showRightDropdown = !this.showRightDropdown
            this.showLeftDropdown = false
        },
        closeLeftDropdown () {
            this.showLeftDropdown = false
        },
        closeRightDropdown () {
            this.showRightDropdown = false
        },
        onDropdownItemClick (tab) {
            // Close dropdowns
            this.closeLeftDropdown()
            this.closeRightDropdown()

            // Find the tab index in scopedTabs
            const tabIndex = this.scopedTabs.findIndex(t => t.label === tab.label)
            if (tabIndex === -1) return

            // Scroll the tab into view
            this.$nextTick(() => {
                const container = this.$refs.scrollContainer
                if (!container) return

                const tabElements = container.querySelectorAll('.ff-tab-option')
                const tabElement = tabElements[tabIndex]

                if (tabElement) {
                    tabElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                    })
                }
            })
        },
        cleanupObservers () {
            if (this.intersectionObserver) {
                this.intersectionObserver.disconnect()
            }
            if (this.resizeObserver) {
                this.resizeObserver.disconnect()
            }
        },
        initWheelScroll () {
            const container = this.$refs.scrollContainer
            if (!container) return

            // Handle mouse wheel scrolling to scroll horizontally
            this.wheelScrollHandler = (e) => {
                // Only convert vertical scroll to horizontal if there's no horizontal scroll already
                // This allows trackpad users to scroll horizontally naturally
                // while mouse wheel users get horizontal scrolling from vertical wheel
                if (e.deltaY !== 0 && e.deltaX === 0) {
                    // Only mouse wheel vertical scrolling - convert to horizontal
                    e.preventDefault()
                    container.scrollLeft += e.deltaY
                }
                // If deltaX is present, let the browser handle it naturally (trackpad horizontal scroll)
            }

            container.addEventListener('wheel', this.wheelScrollHandler, { passive: false })
        },
        cleanupWheelScroll () {
            const container = this.$refs.scrollContainer
            if (container && this.wheelScrollHandler) {
                container.removeEventListener('wheel', this.wheelScrollHandler)
            }
        }
    }
}
</script>
