<template>
    <form class="space-y-6">
        <TemplateSectionPalette v-model="editableTemplate" :editTemplate="true" />
        <TemplateSectionPaletteModules
            v-model="editableTemplate" :editTemplate="true" :readOnly="false" :project="project"
            header="Default Modules"
        />
    </form>
</template>

<script>

import permissionsMixin from '../../../mixins/Permissions.js'

import TemplateSectionPalette from './sections/Palette.vue'
import TemplateSectionPaletteModules from './sections/PaletteModules.vue'

export default {
    name: 'AdminTemplatePalette',
    components: {
        TemplateSectionPalette,
        TemplateSectionPaletteModules
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        modelValue: {
            type: Object,
            required: true
        }
    },
    emits: ['update:modelValue'],
    computed: {
        editableTemplate: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', localValue) }
        }
    }
}
</script>
