<template>
    <div ref="ff-tabs">
        <ul class="ff-tabs" :class="'ff-tabs--' + orientation">
            <li v-for="(tab, $index) in tabs" :key="tab.label" @click="selectTab($index)"
                class="ff-tab-option" :class="{'ff-tab-option--active': tab.isActive}">
                {{ tab.label }}
            </li>
        </ul>
        <div class="ff-tabs-content">
            <slot></slot>
        </div>
    </div>
</template>

<script>
export default {
    name: 'ff-tabs',
    props: {
        orientation: {
            default: '',
            type: String
        }
    },
    emits: ['tab-selected'],
    data () {
        return {
            tabs: [],
            active: -1
        }
    },
    watch: {
        active: function () {
            console.log(this.active)
        }
    },
    created () {
        console.log(this.orientation)
        this.tabs = this.$slots.default().map((vnode) => {
            console.log(vnode)
            return vnode.props
        })
    },
    mounted () {
        this.selectTab(0)
    },
    methods: {
        selectTab (i) {
            this.selectedIndex = i

            // loop over all the tabs
            this.tabs.forEach((tab, index) => {
                tab.isActive = (index === i)
                if (tab.isActive) {
                    this.$emit('tab-selected', tab)
                }
            })
        }
    }
}
</script>
