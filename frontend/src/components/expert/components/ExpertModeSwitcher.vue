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
import { mapState } from 'vuex'

import ToggleButtonGroup from '../../elements/ToggleButtonGroup.vue'

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
        ...mapState('product/expert', [
            'agentMode'

        ]),
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
                this.$store.dispatch('product/expert/setAgentMode', value)
            }
        }
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
