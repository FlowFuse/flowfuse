<template>
    <div class="flex gap-5">
        <ff-text-input v-if="editable" v-model="passwordValue" :readonly="!editable" type="password" />

        <span v-else @click="onTextClick">
            {{ passwordValue }}
        </span>

        <div class="flex gap-2 items-center text-gray-500">
            <text-copier :text="password" :show-text="false" class="ff-text-copier" />

            <component :is="revealIcon" v-if="canBeRevealed" class="ff-icon cursor-pointer" @click="revealed = !revealed" />
        </div>
    </div>
</template>

<script>
import { EyeIcon, EyeOffIcon } from '@heroicons/vue/outline'

import TextCopier from '../../components/TextCopier.vue'

import FfTextInput from './form/TextInput.vue'

export default {
    name: 'password-field',
    components: { FfTextInput, TextCopier },
    props: {
        password: {
            type: String,
            required: true
        },
        editable: {
            type: Boolean,
            default: false
        },
        canBeRevealed: {
            type: Boolean,
            default: false
        },
        canBeCopied: {
            type: Boolean,
            default: false
        }
    },
    emits: ['update:password'],
    data () {
        return {
            revealed: false
        }
    },
    computed: {
        passwordValue: {
            get () {
                if (this.revealed) {
                    return this.password
                }

                return '************'
            },
            set (value) {
                this.$emit('update:password', value)
            }
        },
        revealIcon () {
            return this.revealed ? EyeOffIcon : EyeIcon
        }
    },
    methods: {
        onTextClick () {
            if (this.canBeCopied) {
                this.revealed = true
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
