<template>
    <div class="flex justify-end">
        <a
            v-if="!disabled && url"
            :href="url"
            target="_blank"
            class="ff-btn ff-btn--secondary"
            data-action="open-editor"
            @click.stop
        >
            Open Editor
            <span class="ff-btn--icon ff-btn--icon-right">
                <ExternalLinkIcon />
            </span>
        </a>
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
    }
}
</script>
