<template>
    <div class="flex justify-end">
        <InstanceEditorLink v-if="!isHA" :disabled="disabled" :editorDisabled="editorDisabled" :url="url" :instance="instance" />
        <router-link v-else :to="{name: 'instance-settings-ha', params: { id }}" @click.stop>
            <StatusBadge class="text-gray-400 hover:text-blue-600" status="high-availability" />
        </router-link>
    </div>
</template>

<script>
import StatusBadge from '../../../../components/StatusBadge.vue'
import InstanceEditorLink from '../EditorLink.vue'

export default {
    name: 'InstanceEditorLinkCell',
    components: { InstanceEditorLink, StatusBadge },
    inheritAttrs: false,
    props: {
        id: {
            default: '',
            type: String
        },
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
        },
        isHA: {
            default: false,
            type: Boolean
        },
        instance: {
            default: null,
            type: Object
        }
    }
}
</script>
