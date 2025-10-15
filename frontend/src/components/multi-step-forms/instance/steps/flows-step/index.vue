<template>
    <section class="ff-blueprint-step text-center flex flex-col gap-4" data-step="flows">
        <div class="header flex gap-3 items-center justify-between my-4">
            <h2 class="border-indigo-600 border rounded-xl px-4 py-2 flex-1 bg-indigo-600 text-white">
                Select a Blueprint
            </h2>
            <span>or</span>
            <h2 class="border-indigo-600 border rounded-xl px-4 py-2 flex-1">
                Import Flows
            </h2>
        </div>

        <component
            :is="component"
            :blueprints="blueprints" :initialState="initialState"
            @blueprint-selected="onSelectedBlueprint"
        />
    </section>
</template>

<script>

import { markRaw } from 'vue'

import BlueprintsSection from './BlueprintsSection.vue'

export default {
    name: 'BlueprintStep',
    components: { BlueprintsSection },
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
        }
    },
    emits: ['step-updated'],
    setup (props) {
        const initialState = props.state
        return { initialState }
    },
    data () {
        return {
            component: markRaw(BlueprintsSection)
        }
    },
    methods: {
        onSelectedBlueprint (blueprint) {
            this.$emit('step-updated', {
                [this.slug]: {
                    blueprint,
                    hasErrors: false,
                    errors: null
                }
            })
        }
    }
}
</script>

<style lang="scss">
.ff-blueprint-step {

    .ff-blueprints {
        overflow: auto;
        min-width: 400px;
        max-height: 75vh;
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

        li:hover {
            cursor: pointer;
            color: $ff-blue-600;
        }
    }
}
</style>
