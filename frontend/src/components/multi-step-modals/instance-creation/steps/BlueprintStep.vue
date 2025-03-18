<template>
    <section class="blueprint-step text-center flex flex-col gap-7">
        <h2>Select Your Blueprint</h2>

        <p>We have a collection of pre-build flow templates that you can use as a starting point for your Node-RED Instance.</p>

        <div class="flex gap-16 text-left flex-wrap-reverse">
            <div class="blueprints flex-1">
                <ul class="categories flex flex-col gap-8">
                    <li v-for="(category, $categoryName) in categories" :key="$categoryName" :ref="$categoryName">
                        <h3>{{ $categoryName }}</h3>
                        <hr class="my-3">
                        <ul class="tiles flex gap-5 flex-wrap">
                            <li v-for="(blueprint, $key) in category" :key="$key" class="tile">
                                <BlueprintTile
                                    :blueprint="blueprint"
                                    :display-preview-button="false"
                                    :display-external-url-button="false"
                                    :display-select-button="false"
                                    :tile-behavior="true"
                                    :active="selectedBlueprint && selectedBlueprint.id === blueprint.id"
                                    :alt-preview-button="true"
                                    :class="{'no-icon': !blueprint.icon}"
                                    default-icon="plus"
                                    @selected="onTileSelect"
                                />
                            </li>
                        </ul>
                    </li>
                </ul>
            </div>
            <div class="categories">
                <h3>Categories</h3>
                <hr class="my-3">
                <ul>
                    <li
                        v-for="(category, $categoryName) in categories"
                        :key="$categoryName"
                        class="mb-3 flex gap-3 font-bold"
                    >
                        <div class="flex-1 flex gap-2 cursor-pointer" @click="onCategoryClick($categoryName)">
                            <span>
                                {{ $categoryName }}
                            </span>
                        </div>
                        <div>{{ category.length }}</div>
                    </li>
                </ul>
            </div>
        </div>
    </section>
</template>

<script>
import { PlusIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import flowBlueprintsApi from '../../../../api/flowBlueprints.js'
import { scrollIntoView } from '../../../../composables/Ux.js'
import BlueprintTile from '../../../blueprints/BlueprintTile.vue'

export default {
    name: 'BlueprintStep',
    components: { BlueprintTile },
    props: {
        slug: {
            required: true,
            type: String
        },
        state: {
            required: false,
            type: Object,
            default: () => ({})
        }
    },
    emits: ['step-updated'],
    setup () {
        return { PlusIcon }
    },
    data () {
        return {
            blueprints: [],
            selectedBlueprint: null
        }
    },
    computed: {
        ...mapState('account', ['team']),
        categories () {
            return [...this.blueprints].sort((a, b) => {
                return a.order - b.order
            }).reduce((acc, blueprint) => {
                const category = blueprint.category || 'Other';
                (acc[category] = acc[category] || []).push(blueprint)
                return acc
            }, {})
        }
    },
    watch: {
        selectedBlueprint: {
            handler (blueprint) {
                this.$emit('step-updated', {
                    [this.slug]: {
                        blueprint,
                        hasErrors: false,
                        errors: null
                    }
                })
            },
            deep: true,
            immediate: true
        }
    },
    async mounted () {
        await this.getBlueprints()
    },
    methods: {
        async getBlueprints () {
            const response = await flowBlueprintsApi.getFlowBlueprintsForTeam(this.team.id)
            this.blueprints = response.blueprints
        },
        onCategoryClick (category) {
            const el = this.$refs[category]

            if (el.length > 0) {
                scrollIntoView(el[0])
            }
        },
        onTileSelect (blueprint) {
            if (this.selectedBlueprint && this.selectedBlueprint.id === blueprint.id) {
                this.selectedBlueprint = null
            } else {
                this.selectedBlueprint = blueprint
            }
        }
    }
}
</script>

<style lang="scss">
.blueprint-step {

    .blueprints {
        overflow: auto;
        min-width: 400px;
        max-height: 65vh;
        padding-right: 15px;

        .tiles {
            .tile {
                .ff-blueprint-tile {
                    width: 280px;

                    .ff-blueprint-tile--header {
                        height: 115px;

                        .ff-icon {
                            transform: scale(8);
                            position: absolute;
                            top: 70px;
                        }
                    }

                    &.no-icon {
                        .ff-blueprint-tile--header {
                            .ff-icon:not(.alt-preview) {
                                transform: scale(4);
                                position: initial;
                            }
                        }
                    }
                }
            }
        }
    }

    .categories {
        min-width: 300px;
    }
}
</style>
