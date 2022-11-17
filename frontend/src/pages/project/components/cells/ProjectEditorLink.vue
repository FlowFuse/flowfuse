<template>
    <div class="flex justify-end">
        <a
            v-if="!disabled"
            :href="url"
            target="_blank"
            class="ff-btn ff-btn--secondary"
            data-action="open-editor"
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
    name: 'ProjectEditorLink',
    components: { ExternalLinkIcon },
    props: {
        disabled: {
            default: false,
            type: Boolean
        },
        url: {
            required: true,
            type: String
        }
    }
}
</script>
