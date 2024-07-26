<template>
    <div
        v-ff-tooltip="blueprint.description"
        class="ff-blueprint-tile-sm cursor-pointer" :class="'ff-blueprint-group--' + categoryClass"
        data-action="click-small-blueprint-tile"
        @click="onClick"
    >
        <div class="ff-blueprint-tile--header">
            <component :is="getIcon(blueprint.icon)" class="ff-icon" />
        </div>
        <div class="ff-blueprint-tile--info">
            <label>{{ blueprint.name }}</label>
        </div>
    </div>
</template>

<script>
import { QuestionMarkCircleIcon } from '@heroicons/vue/outline'
import { defineAsyncComponent } from 'vue'

export default {
    name: 'BlueprintTile',
    props: {
        blueprint: {
            required: true,
            type: Object
        }
    },
    emits: ['click'],
    computed: {
        categoryClass () {
            // to lower case and strip spaces
            return this.blueprint?.category.toLowerCase().replace(/\s/g, '-')
        }
    },
    methods: {
        getIcon (iconName) {
            if (!iconName) {
                return QuestionMarkCircleIcon
            }

            // Convert kebab-case to pascalCase used for import
            const camelCase = iconName.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
            const pascalCase = camelCase.charAt(0).toUpperCase() + camelCase.slice(1)
            const importName = `${pascalCase}Icon`

            return defineAsyncComponent(async () => {
                let icon
                try {
                    icon = await import(`@heroicons/vue/outline/${importName}.js`)
                } catch (err) {
                    console.warn(`Did not recognise icon name "${iconName}" (imported as "${importName}")`)
                    icon = await import('@heroicons/vue/outline/QuestionMarkCircleIcon.js')
                }
                return icon
            })
        },
        onClick () {
            this.$emit('click', this.blueprint)
        }
    }
}
</script>
