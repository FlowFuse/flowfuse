<template>
    <span
        class="flex items-center gap-2"
    >
        <IconNodeRedSolid class="ff-icon ff-icon-lg text-red-800" />
        <div class="flex flex-col">
            <span>{{ name }}</span>
            <TextCopier
                v-if="url && copyable"
                :text="url"
                :show-text="true"
                class="deployment-name__url text-xs text-gray-400"
            />
            <span v-else-if="url" class="text-xs text-gray-400">{{ url }}</span>
        </div>
    </span>
</template>

<script>
import TextCopier from '../../../../components/TextCopier.vue'
import IconNodeRedSolid from '../../../../components/icons/NodeRedSolid.js'

export default {
    name: 'DeploymentName',
    components: { IconNodeRedSolid, TextCopier },
    inheritAttrs: false,
    props: {
        name: {
            required: true,
            type: String
        },
        url: {
            type: String,
            default: ''
        },
        copyable: {
            type: Boolean,
            default: true
        }
    }
}
</script>

<style scoped lang="scss">
.deployment-name__url {
    :deep(.ff-icon) {
        width: 14px;
        height: 14px;
    }
    :deep(.ff-icon-button) {
        background: transparent;
    }
}
</style>
