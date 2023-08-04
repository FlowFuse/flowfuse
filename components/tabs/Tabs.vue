<template>
    <div ref="ff-tabs">
        <ul class="ff-tabs" :class="'ff-tabs--' + orientation">
            <li v-for="(tab, $index) in scopedTabs" :key="tab.label" class="ff-tab-option transition-fade--color"
                :class="{'ff-tab-option--active': tab.isActive}" @click="selectTab($index)"
            >
                {{ tab.label }}
            </li>
        </ul>
    </div>
</template>

<script>
export default {
    name: 'ff-tabs',
    props: {
        orientation: {
            default: '',
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
            console.log('tabs changed')
            const index = this.selectedIndex < 0 ? 0 : this.selectedIndex
            this.selectTab(index)
        }
    },
    mounted () {
        this.scopedTabs = this.tabs
        this.selectTab(0)
    },
    methods: {
        selectTab (i) {
            this.selectedIndex = i

            // loop over all the tabs
            this.scopedTabs?.forEach((tab, index) => {
                tab.isActive = (index === i)
                if (tab.isActive) {
                    this.$emit('tab-selected', tab)
                }
            })
        }
    }
}
</script>
