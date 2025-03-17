<template>
    <span class="ff-text-copier">
        <span v-if="showText" @click="copyPath">
            <slot name="default">
                <span class="text">{{ text }}</span>
            </slot>
        </span>
        <DuplicateIcon v-if="text.length" class="ff-icon" @click="copyPath" @click.prevent.stop />
        <span ref="copied" class="ff-copied" :class="{ 'ff-copied-left': promptPosition === 'left'}">Copied!</span>
    </span>
</template>

<script>
import { DuplicateIcon } from '@heroicons/vue/outline'

import Alert from '../services/alerts.js'

export default {
    name: 'TextCopier',
    components: { DuplicateIcon },
    props: {
        text: {
            required: true,
            type: String
        },
        confirmationType: {
            type: String,
            required: false,
            default: 'prompt',
            validator: (value) => {
                return ['prompt', 'alert'].includes(value)
            }
        },
        showText: {
            required: false,
            type: Boolean,
            default: true
        },
        promptPosition: {
            required: false,
            type: String,
            default: 'right',
            validator: (value) => {
                return ['left', 'right'].includes(value)
            }
        }
    },
    emits: ['copied'],
    methods: {
        copyPath () {
            navigator.clipboard.writeText(this.text)

            if (this.confirmationType === 'alert') {
                Alert.emit('Copied to Clipboard', 'confirmation')
            } else {
                // show "Copied" notification
                this.$refs.copied.style.display = 'inline'
                // hide after 500ms
                setTimeout(() => {
                    this.$refs.copied.style.display = 'none'
                }, 500)
                this.$emit('copied')
            }
        }
    }
}
</script>

<style scoped lang="scss">
.ff-text-copier {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  position: relative;
  &:hover {
    cursor: pointer;
  }
  .ff-copied {
    background-color: black;
    color: white;
    padding: 3px;
    border-radius: 3px;
    position: absolute;
    margin-top: -3px;
    margin-left: 3px;
    display: none;
    z-index: 100;
    left: 100%;
  }
  .ff-copied-left {
    left: inherit;
    right: 100%;
  }
}
</style>
