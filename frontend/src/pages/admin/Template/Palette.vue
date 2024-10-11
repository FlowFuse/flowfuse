<template>
    <form class="space-y-6">
        <TemplateSectionPalette v-model="editableTemplate" :editTemplate="true" />
        <TemplateSectionCatalogue v-model="editableTemplate" :editTemplate="true" :project="project" />
        <TemplateSectionNPM v-model="editableTemplate" :editTemplate="true" :project="project" />
        <TemplateSectionPaletteModules
            v-model="editableTemplate" :editTemplate="true" :readOnly="false" :project="project"
            header="Default Modules"
        />
    </form>
</template>

<script>

import { mapState } from 'vuex'

import permissionsMixin from '../../../mixins/Permissions.js'

import TemplateSectionCatalogue from './sections/Catalogues.vue'
import TemplateSectionNPM from './sections/NPMRegistry.vue'
import TemplateSectionPalette from './sections/Palette.vue'
import TemplateSectionPaletteModules from './sections/PaletteModules.vue'

export default {
    name: 'AdminTemplatePalette',
    components: {
        TemplateSectionCatalogue,
        TemplateSectionNPM,
        TemplateSectionPalette,
        TemplateSectionPaletteModules
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: false,
            default: null
        },
        modelValue: {
            type: Object,
            required: true
        }
    },
    emits: ['update:modelValue'],
    computed: {
        ...mapState('account', ['features']),
        catalogFeatureAvailable () {
            return !!this.features.customCatalogs
        },
        editableTemplate: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', localValue) }
        }
    }
}
</script>
