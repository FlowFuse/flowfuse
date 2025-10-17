<template>
    <section data-section="blueprints" class="blueprints-section">
        <h1 class="mt-6 mb-5">We have a collection of pre-built flows that you can use as a starting point for your Node-RED Instance.</h1>

        <transition name="fade" mode="out-in">
            <ff-loading v-if="loading" message="Loading Blueprints..." />
            <div v-else class="flex flex-1 flex-col gap-7 overflow-auto" data-el="blueprints-wrapper">
                <div class="flex flex-1 gap-16 text-left flex-wrap-reverse overflow-auto">
                    <div class="ff-blueprints flex flex-col flex-1 overflow-auto h-full">
                        <ul class="flex flex-col gap-8" data-group="blueprint-groups">
                            <li
                                v-for="(category, $categoryName) in categories"
                                :key="$categoryName"
                                :ref="$categoryName"
                                data-group="blueprints"
                            >
                                <h3>{{ $categoryName }}</h3>
                                <hr class="my-3">
                                <ul class="ff-blueprint-tiles grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                                    <li v-for="(blueprint, $key) in category" :key="$key" class="tile">
                                        <BlueprintTile
                                            :blueprint="blueprint"
                                            :display-preview-button="false"
                                            :display-external-url-button="true"
                                            :display-select-button="false"
                                            :tile-behavior="true"
                                            :active="selectedBlueprint && selectedBlueprint.id === blueprint.id"
                                            :alt-preview-button="true"
                                            :class="{'no-icon': !blueprint.icon}"
                                            class="cursor-pointer"
                                            @selected="onTileSelect"
                                            @preview="onPreview($event)"
                                        />
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                    <div class="ff-blueprint-categories">
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
            </div>
        </transition>

        <AssetDetailDialog ref="flowRendererDialog" />
    </section>
</template>

<script>
import { mapState } from 'vuex'

import { scrollIntoView } from '../../../../../composables/Ux.js'

import FfLoading from '../../../../Loading.vue'
import BlueprintTile from '../../../../blueprints/BlueprintTile.vue'
import AssetDetailDialog from '../../../../dialogs/AssetDetailDialog.vue'

export default {
    name: 'BlueprintsSection',
    components: {
        FfLoading,
        AssetDetailDialog,
        BlueprintTile
    },
    props: {
        blueprints: {
            type: Array,
            required: true
        },
        initialState: {
            type: Object,
            required: true
        }
    },
    emits: ['blueprint-selected'],
    data () {
        return {
            selectedBlueprint: this.initialState.blueprint ?? null,
            loading: true
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
                this.$emit('blueprint-selected', blueprint)
            },
            deep: true,
            immediate: true
        }
    },
    async mounted () {
        this.preSelectBlueprint()
            .catch(e => e)
            .finally(() => {
                this.loading = false
            })
    },
    methods: {
        onCategoryClick (category) {
            const el = this.$refs[category]

            if (el.length > 0) {
                scrollIntoView(el[0])
            }
        },
        onPreview (blueprint) {
            this.$refs.flowRendererDialog.show(blueprint)
        },
        onTileSelect (blueprint) {
            if (this.selectedBlueprint && this.selectedBlueprint.id === blueprint.id) {
                this.selectedBlueprint = null
            } else {
                this.selectedBlueprint = blueprint
            }
        },
        preSelectBlueprint () {
            return new Promise(resolve => {
                if ((this.$route?.query && this.$route?.query?.blueprintId) || this.$route.name === 'DeployBlueprint') {
                    // we can safely assume we got to this point either by selecting a blueprint from the Team Library or
                    // through a website deployment, so we really want a blueprint
                    let blueprint = this.blueprints.find(bp => bp.id === this.$route.query.blueprintId)
                    if (!blueprint) {
                        // because we really want a blueprint selected but can't find the requested one, we'll fall back to the default one
                        blueprint = this.blueprints.find(bp => bp.default)
                    }

                    this.selectedBlueprint = blueprint ?? null
                }
                resolve()
            })
        }
    }
}
</script>

<style scoped lang="scss">
.blueprints-section {
    display: flex;
    flex-direction: column;
    overflow: auto;
    flex: 1;
}
</style>
