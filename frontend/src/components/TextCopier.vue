<template>
    <span class="ff-text-copier">
        <span @click="copyPath">
            <slot name="default">
                <span class="text">{{ text }}</span>
            </slot>
        </span>
        <DuplicateIcon v-if="text.length" class="ff-icon" @click="copyPath" @click.prevent.stop />
        <span ref="copied" class="ff-copied">Copied!</span>
    </span>
</template>

<script>
import { DuplicateIcon } from '@heroicons/vue/outline'

export default {
    name: 'TextCopier',
    components: { DuplicateIcon },
    props: {
        text: {
            required: true,
            type: String
        }
    },
    methods: {
        copyPath () {
            navigator.clipboard.writeText(this.text)

            // show "Copied" notification
            this.$refs.copied.style.display = 'inline'
            // hide after 500ms
            setTimeout(() => {
                this.$refs.copied.style.display = 'none'
            }, 500)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-text-copier {
  .ff-icon {
    &:hover {
      cursor: pointer;
    }
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
  }
}
</style>
