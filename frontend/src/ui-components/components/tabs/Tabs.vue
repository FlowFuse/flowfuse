<template>
    <div>
        <ul class="ff-tabs" :class="'ff-tabs--' + orientation">
            <router-link
                v-for="(tab, $index) in scopedTabs"
                :key="tab.label"
                data-el="ff-tab"
                class="ff-tab-option transition-fade--color"
                :to="tab.to"
                :data-nav="tab.tag"
                @click="selectTab($index)"
            >
                {{ tab.label }}
            </router-link>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'ff-tabs',
    props: {
        orientation: {
            default: 'horizontal',
            type: String
        },
        tabs: {
            default: () => [],
            type: Array
        }
    },
    emits: ['tab-selected'],
    data () {
        return {
            selectedIndex: -1,
            scopedTabs: []
        }
    },
    watch: {
        tabs: function () {
            this.scopedTabs = this.tabs
        }
    },
    mounted () {
        this.scopedTabs = this.tabs
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
        }
    }
}
</script>
