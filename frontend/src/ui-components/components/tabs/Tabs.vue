<template>
    <div class="ff-tabs-wrapper" :class="{ 'ff-tabs-wrapper--overflow-enabled': enableOverflow }">
        <HeadlessMenu v-if="enableOverflow && hasHiddenLeft" as="div" class="ff-tabs__menu-wrapper ff-tabs__menu-wrapper--left">
            <MenuButton class="ff-tabs__overflow-button ff-tabs__overflow-button--left" aria-label="Show hidden tabs on the left">
                <ChevronLeftIcon class="ff-icon" />
                <ChevronLeftIcon class="ff-icon ff-icon-second" />
            </MenuButton>
            <MenuItems class="z-50 absolute left-0 top-full origin-top-left mt-1 max-h-96 overflow-y-auto bg-white divide-y divide-gray-100 rounded shadow-lg ring-1 ring-black/10 focus:outline-none" style="max-width: min(14rem, calc(100vw - 1rem)); width: 14rem;">
                <MenuItem
                    v-for="tab in hiddenLeftTabs"
                    :key="'left-' + tab.label"
                    v-slot="{ active }"
                >
                    <button
                        :class="[active ? 'bg-gray-200' : '', 'block w-full text-left px-4 py-2 text-sm text-gray-700']"
                        @click="onDropdownItemClick(tab)"
                    >
                        <component :is="tab.icon" v-if="tab.icon" class="h-4 w-4 inline rounded mr-1" />
                        {{ tab.label }}
                    </button>
                </MenuItem>
            </MenuItems>
        </HeadlessMenu>

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
                    <component :is="tab.icon" v-if="tab.icon" class="ff-tab-icon" alt="" />
                    <span class="ff-tab-label">{{ tab.label }}</span>
                    <span v-if="tab.featureUnavailable" v-ff-tooltip="'Not available in this Team Tier'" data-el="premium-feature">
                        <SparklesIcon class="ff-icon transition-fade--color hollow" style="stroke-width: 1;" />
                    </span>
                </router-link>
            </ul>
        </div>

        <HeadlessMenu v-if="enableOverflow && hasHiddenRight" as="div" class="ff-tabs__menu-wrapper ff-tabs__menu-wrapper--right">
            <MenuButton ref="rightMenuButton" class="ff-tabs__overflow-button ff-tabs__overflow-button--right" aria-label="Show hidden tabs on the right" @click="updateRightMenuPosition">
                <ChevronRightIcon class="ff-icon" />
                <ChevronRightIcon class="ff-icon ff-icon-second" />
            </MenuButton>
            <Teleport to="body">
                <MenuItems class="z-50 fixed origin-top-left max-h-96 overflow-y-auto bg-white divide-y divide-gray-100 rounded shadow-lg ring-1 ring-black/10 focus:outline-none" :style="rightMenuStyle">
                    <MenuItem
                        v-for="tab in hiddenRightTabs"
                        :key="'right-' + tab.label"
                        v-slot="{ active }"
                    >
                        <button
                            :class="[active ? 'bg-gray-200' : '', 'block w-full text-left px-4 py-2 text-sm text-gray-700']"
                            @click="onDropdownItemClick(tab)"
                        >
                            <component :is="tab.icon" v-if="tab.icon" class="h-4 w-4 inline rounded mr-1" />
                            {{ tab.label }}
                        </button>
                    </MenuItem>
                </MenuItems>
            </Teleport>
        </HeadlessMenu>
    </div>
</template>

<script>
import { Menu as HeadlessMenu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { SparklesIcon } from '@heroicons/vue/outline'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/solid'

export default {
    name: 'ff-tabs',
    components: {
        SparklesIcon,
        ChevronLeftIcon,
        ChevronRightIcon,
        HeadlessMenu,
        MenuButton,
        MenuItem,
        MenuItems
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
            default: true,
            type: Boolean
        }
    },
    emits: ['tab-selected'],
    data () {
        return {
            selectedIndex: -1,
            visibleTabs: [],
            hasOverflow: false,
            resizeObserver: null,
            intersectionObserver: null,
            wheelScrollHandler: null,
            rightMenuPosition: { top: '0px', left: '0px' }
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
            return this.hasOverflow && this.hiddenLeftTabs.length > 0
        },
        hasHiddenRight () {
            if (!this.enableOverflow || this.orientation !== 'horizontal') return false
            return this.hasOverflow && this.hiddenRightTabs.length > 0
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
        },
        rightMenuStyle () {
            return this.rightMenuPosition
        }
    },
    watch: {
        hasHiddenRight (newVal) {
            if (newVal) {
                this.$nextTick(() => {
                    this.updateRightMenuPosition()
                })
            }
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
        updateRightMenuPosition () {
            if (!this.$refs.rightMenuButton) return
            const button = this.$refs.rightMenuButton.$el || this.$refs.rightMenuButton
            const rect = button.getBoundingClientRect()

            const menuWidth = 224 // 14rem = 224px
            const padding = 8
            const maxLeft = window.innerWidth - menuWidth - padding
            const left = Math.max(padding, Math.min(rect.left, maxLeft))

            this.rightMenuPosition = {
                top: `${rect.bottom + 4}px`,
                left: `${left}px`,
                width: `min(14rem, calc(100vw - ${padding * 2}px))`
            }
        },
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
        getTabElements () {
            // Get tab elements from Vue refs instead of DOM queries
            return this.scopedTabs.map((_, index) => {
                const ref = this.$refs['tab-' + index]
                // Refs can be arrays when v-for is used, so handle both cases
                const componentOrEl = Array.isArray(ref) ? ref[0] : ref
                // router-link refs are component instances, need to get the actual DOM element
                return componentOrEl?.$el || componentOrEl
            }).filter(Boolean) // Remove any undefined refs
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
            const tabElements = this.getTabElements()
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

            // Check if tabs actually overflow the container
            this.hasOverflow = container.scrollWidth > container.offsetWidth

            const containerRect = container.getBoundingClientRect()
            const tabElements = this.getTabElements()

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
        onDropdownItemClick (tab) {
            // HeadlessUI Menu will auto-close the dropdown
            // Find the tab index in scopedTabs
            const tabIndex = this.scopedTabs.findIndex(t => t.label === tab.label)
            if (tabIndex === -1) {
                return
            }

            // Scroll the tab into view immediately (synchronously)
            const container = this.$refs.scrollContainer
            if (container) {
                const tabElements = this.getTabElements()
                const tabElement = tabElements[tabIndex]

                if (tabElement) {
                    // Find all scrollable ancestors and store their scroll positions
                    const scrollableAncestors = []
                    let parent = container.parentElement
                    while (parent) {
                        if (parent.scrollLeft !== undefined) {
                            scrollableAncestors.push({
                                element: parent,
                                scrollLeft: parent.scrollLeft
                            })
                        }
                        parent = parent.parentElement
                    }

                    tabElement.scrollIntoView({
                        behavior: 'auto',
                        block: 'nearest',
                        inline: 'nearest'
                    })

                    // Restore scroll positions of ancestors (but not the immediate container)
                    scrollableAncestors.forEach(({ element, scrollLeft }) => {
                        if (element !== container) {
                            element.scrollLeft = scrollLeft
                        }
                    })
                }
            }

            // Navigate after scroll
            if (tab.to) {
                this.$router.push(tab.to)
            }
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
