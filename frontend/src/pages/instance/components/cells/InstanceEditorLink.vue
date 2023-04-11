<template>
    <div class="flex justify-end">
        <InstanceEditorLink :disabled="disabled" :editorDisabled="editorDisabled" :url="url" />
    </div>
</template>

<script>
import InstanceEditorLink from '../InstanceEditorLink.vue'

export default {
    name: 'InstanceEditorLinkCell',
    components: { InstanceEditorLink },
    inheritAttrs: false,
    props: {
        disabled: {
            default: false,
            type: Boolean
        },
        editorDisabled: {
            default: false,
            type: Boolean
        },
        url: {
            default: '',
            type: String
        }
    }
}
</script>
