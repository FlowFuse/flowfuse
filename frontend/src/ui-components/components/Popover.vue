<template>
    <Popover v-slot="{ open }" class="relative">
        <span v-if="syncOpenState(open)" class="hidden" />
        <PopoverButton ref="trigger"
                       class="ff-btn ff-btn-icon transition-fade--color"
                       :class="{...buttonClass, active: open}"
                       :disabled="disabled"
                       @click="() => { $nextTick(() => { updateItemsPosition() }) }"
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
            <transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <PopoverPanel
                    v-if="open"
                    v-slot="{ close }"
                    ref="menu-items"
                    class="fixed w-full overflow-auto bg-white border border-gray-200 rounded-md shadow-md z-[200]"
                    :style="{
                        top: position.top + 'px',
                        left: position.left + 'px',
                        width: 'fit-content'
                    }"
                >
                    <slot name="panel" :close="close" />
                </PopoverPanel>
            </transition>
        </teleport>
    </Popover>
</template>

<script>
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/solid'
import { defineComponent } from 'vue'

import TeleportedMenuMixin from '../../mixins/TeleportedMenuMixin.js'

export default defineComponent({
    name: 'ff-popover',
    components: {
        ChevronDownIcon,
        Popover,
        PopoverButton,
        PopoverPanel
    },
    mixins: [TeleportedMenuMixin],
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
