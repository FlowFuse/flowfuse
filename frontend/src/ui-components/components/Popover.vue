<template>
    <Popover v-slot="{ open }" class="relative">
        <PopoverButton ref="trigger"
                       class="ff-btn ff-btn-icon transition-fade--color"
                       :class="{...buttonClass, active: open}"
                       :disabled="disabled"
                       @click="() => { $nextTick(() => { updatePosition(); open = true }) }"
        >
            <span v-if="hasIconLeft" class="ff-btn--icon ff-btn--icon-left">
                <slot name="icon-left"></slot>
            </span>
            <span>{{ buttonText }}</span>
            <span class="ml-2">
                <ChevronDownIcon class="ff-icon transition-ease" :class="{ 'rotate-180 transform': open }" />
            </span>
        </PopoverButton>
        <teleport to="body">
            <PopoverPanel
                v-if="open"
                v-slot="{ close }"
                class="absolute w-full overflow-auto bg-white  border border-gray-200 rounded shadow z-200"
                :style="{
                    top: position.top + 10 + 'px',
                    left: position.left + 'px',
                    width: 'fit-content'
                }"
            >
                <slot name="panel" :close="close" />
            </PopoverPanel>
        </teleport>
    </Popover>
</template>

<script>
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'
import { defineComponent } from 'vue'

import BoxOptionsMixin from '../../mixins/BoxOptionsMixin.js'

export default defineComponent({
    name: 'ff-popover',
    components: {
        ChevronDownIcon,
        Popover,
        PopoverButton,
        PopoverPanel
    },
    mixins: [BoxOptionsMixin],
    props: {
        buttonText: {
            type: String,
            required: true
        },
        buttonKind: {
            default: 'primary',
            type: String // "primary", "secondary", "tertiary"
        },
        disabled: {
            default: false,
            required: false,
            type: Boolean
        }
    },
    computed: {
        hasIconLeft: function () {
            return this.$slots['icon-left']
        },
        buttonClass () {
            return {
                ['ff-btn--' + this.buttonKind]: true,
                'ff-btn-small': this.buttonKind === 'small',
                'ff-btn-fwidth': this.buttonKind === 'full-width'
            }
        }
    }
})
</script>

<style scoped lang="scss">

</style>
