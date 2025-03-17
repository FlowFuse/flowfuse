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
                <span v-if="tab.featureUnavailable" v-ff-tooltip="'Not available in this Team Tier'" data-el="premium-feature">
                    <SparklesIcon class="ff-icon transition-fade--color hollow" style="stroke-width: 1;" />
                </span>
            </router-link>
        </ul>
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/outline'
export default {
    name: 'ff-tabs',
    components: {
        SparklesIcon
    },
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
            selectedIndex: -1
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
        }
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
