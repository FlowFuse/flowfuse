<template>
    <div class="ff-blueprint-tile" :class="'ff-blueprint-group--' + categoryClass">
        <div class="ff-blueprint-tile--header">
            <component :is="getIcon(blueprint.icon)" class="ff-icon" />
        </div>
        <div class="ff-blueprint-tile--info">
            <label>{{ blueprint.name }}</label>
            <p>{{ blueprint.description }}</p>
        </div>
        <div class="ff-blueprint-tile--actions" :class="{'justify-between': showDefault, 'justify-end': !showDefault}">
            <div v-if="showDefault" v-ff-tooltip:bottom="'Default Blueprint'" class="text-green-600 flex items-center gap-1">
                <CheckCircleIcon class="ff-icon-lg" />
                <label class="text-green-800">Default</label>
            </div>
            <ff-button v-if="!editable" @click="choose(blueprint)">
                Select
            </ff-button>
            <ff-button v-else @click="$emit('selected', blueprint)">
                Edit
            </ff-button>
        </div>
    </div>
</template>

<script>
import { CheckCircleIcon, QuestionMarkCircleIcon } from '@heroicons/vue/outline'
import { defineAsyncComponent } from 'vue'
import { mapState } from 'vuex'

import product from '../../../services/product.js'

export default {
    name: 'BlueprintTile',
    components: {
        CheckCircleIcon
    },
    props: {
        blueprint: {
            required: true,
            type: Object
        },
        editable: {
            type: Boolean,
            default: false
        }
    },
    emits: ['selected'],
    computed: {
        ...mapState('account', ['team']),
        categoryClass () {
            // to lower case and strip spaces
            return this.blueprint?.category.toLowerCase().replace(/\s/g, '-')
        },
        showDefault () {
            return this.blueprint.default && this.editable
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
                    icon = QuestionMarkCircleIcon
                }
                return icon
            })
        },
        choose (blueprint) {
            product.capture('blueprint-selected', {
                blueprintId: blueprint.id,
                blueprintName: blueprint.name
            }, {
                team: this.team.id,
                application: this.$route.params.id
            })
            this.$emit('selected', blueprint)
        }
    }
}
</script>
