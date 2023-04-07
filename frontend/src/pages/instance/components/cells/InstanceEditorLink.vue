<template>
    <div class="flex justify-end">
        <ff-button data-action="open-editor" kind="secondary" :disabled="disabled || !url" @click.stop="openEditor()">
            <template #icon-right><ExternalLinkIcon /></template>
            Open Editor
        </ff-button>
    </div>
</template>

<script>
import { ExternalLinkIcon } from '@heroicons/vue/solid'

export default {
    name: 'InstanceEditorLink',
    components: { ExternalLinkIcon },
    inheritAttrs: false,
    props: {
        disabled: {
            default: false,
            type: Boolean
        },
        url: {
            default: '',
            type: String
        }
    },
    methods: {
        openEditor () {
            window.open(this.url, '_blank')
        }
    }
}
</script>
