<template>
    <div :class="{'mode-switcher-floating': isFloating}">
        <toggle-button-group
            v-model="agentModeWrapper"
            :buttons="agentModeButtons"
            :uses-links="false"
            :visually-hide-title="true"
        />
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'

import ToggleButtonGroup from '../../elements/ToggleButtonGroup.vue'

import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'ExpertModeSwitcher',
    components: { ToggleButtonGroup },
    props: {
        isFloating: {
            required: false,
            type: Boolean,
            default: false
        }
    },
    computed: {
        ...mapState(useProductExpertStore, ['agentMode']),
        agentModeButtons () {
            return [
                { title: 'Support', value: 'ff-agent' },
                { title: 'Insights', value: 'operator-agent' }
            ]
        },
        agentModeWrapper: {
            get () {
                return this.agentMode
            },
            set (value) {
                this.setAgentMode(value)
            }
        }
    },
    methods: {
        ...mapActions(useProductExpertStore, ['setAgentMode'])
    }
}
</script>

<style scoped lang="scss">
.mode-switcher-floating {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
