<template>
    <section class="ff-flows-step text-center flex flex-col h-full" data-step="flows">
        <div v-if="isSectionSelectorVisible" class="header flex gap-3 items-center justify-evenly pt-11 max-w-6xl w-full m-auto">
            <ff-button
                :kind="selection === BLUEPRINT_SECTION_KEY ? 'primary' : 'secondary'"
                class="w-full max-w-md" @click.prevent="onSectionClick(BLUEPRINT_SECTION_KEY)"
            >
                Select a Blueprint
            </ff-button>

            <span>or</span>

            <ff-button
                :kind="selection === IMPORT_SECTION_KEY ? 'primary' : 'secondary'"
                class="w-full max-w-md" @click.prevent="onSectionClick(IMPORT_SECTION_KEY)"
            >
                Import Flows
            </ff-button>
        </div>

        <component
            :is="sections[selection]"
            :blueprints="blueprints" :initialState="initialState"
            @blueprint-selected="onSelectedBlueprint"
            @flows-updated="onFlowsUpdated"
        />
    </section>
</template>

<script>

import { markRaw } from 'vue'

import BlueprintsSection from './BlueprintsSection.vue'
import ImportFlowsSection from './ImportFlowsSection.vue'

const BLUEPRINT_SECTION_KEY = 'blueprint'
const IMPORT_SECTION_KEY = 'import'

export default {
    name: 'BlueprintStep',
    props: {
        slug: {
            required: true,
            type: String
        },
        state: {
            required: false,
            type: Object,
            default: () => ({})
        },
        blueprints: {
            type: Array,
            required: true
        },
        deployingBlueprint: {
            required: false,
            type: Boolean,
            default: false
        }
    },
    emits: ['step-updated'],
    setup (props) {
        const initialState = props.state
        return { initialState, BLUEPRINT_SECTION_KEY, IMPORT_SECTION_KEY }
    },
    data () {
        return {
            selection: this.blueprints.length > 0 ? BLUEPRINT_SECTION_KEY : IMPORT_SECTION_KEY,
            sections: {
                [BLUEPRINT_SECTION_KEY]: markRaw(BlueprintsSection),
                [IMPORT_SECTION_KEY]: markRaw(ImportFlowsSection)
            }
        }
    },
    computed: {
        isSectionSelectorVisible () {
            if (this.deployingBlueprint) {
                return false
            }
            return this.blueprints.length > 0
        }
    },
    methods: {
        onSelectedBlueprint (blueprint) {
            this.$emit('step-updated', {
                [this.slug]: {
                    blueprint,
                    flows: null,
                    hasErrors: false,
                    errors: null
                }
            })
        },
        onFlowsUpdated (flows) {
            this.$emit('step-updated', {
                [this.slug]: {
                    blueprint: null,
                    flows: JSON.parse(flows),
                    hasErrors: false,
                    errors: null
                }
            })
        },
        onSectionClick (section) {
            this.selection = section
        }
    }
}
</script>

<style lang="scss">
.ff-flows-step {
    height: 100%;

    .ff-blueprints {
        overflow: auto;
        min-width: 400px;
        padding-right: 15px;

        .ff-blueprint-tiles {
            .ff-blueprint-tile {
                max-width: 280px;
                width: 100%;
                height: 100%;
            }
        }
    }

    .ff-blueprint-categories {
        min-width: 300px;
        height: 100%;
        overflow: auto;
        display: flex;
        flex-direction: column;

        ul {
            flex: 1;
            height: 100%;
            overflow: auto;

            li:hover {
                cursor: pointer;
                color: $ff-blue-600;
            }
        }
    }
}
</style>
