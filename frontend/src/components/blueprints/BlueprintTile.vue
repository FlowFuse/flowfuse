<template>
    <div class="ff-blueprint-tile" :class="{['ff-blueprint-group--' + categoryClass]: true, active}" data-el="blueprint-tile">
        <div class="ff-blueprint-tile--header">
            <component :is="getIcon(blueprint.icon)" class="ff-icon" />
        </div>
        <div class="ff-blueprint-tile--info">
            <label>{{ blueprint.name }}</label>
            <p>{{ blueprint.description }}</p>
        </div>
        <div class="ff-blueprint-tile--actions justify-between">
            <div class="left flex gap-2">
                <ff-button
                    v-if="displayExternalUrlButton && blueprint.externalUrl"
                    kind="secondary"
                    @click.prevent="openInANewTab(blueprint.externalUrl)"
                >
                    More Info
                </ff-button>
                <div v-if="showDefault" v-ff-tooltip:bottom="'Default Blueprint'" class="text-green-600 flex items-center gap-1">
                    <CheckCircleIcon class="ff-icon-lg" />
                    <label class="text-green-800">Default</label>
                </div>
            </div>
            <div class="right flex gap-2">
                <ff-button
                    v-if="displayPreviewButton"
                    data-action="show-blueprint"
                    class="ff-btn--secondary"
                    @click="$refs.flowRendererDialog.show(blueprint)"
                >
                    <template #icon>
                        <ProjectIcon />
                    </template>
                </ff-button>
                <ff-button v-if="!editable" data-action="select-blueprint" @click="choose(blueprint)">
                    Select
                </ff-button>
                <ff-button v-else data-action="edit-blueprint" @click="$emit('selected', blueprint)">
                    Edit
                </ff-button>
            </div>
        </div>
        <AssetDetailDialog v-if="displayPreviewButton" ref="flowRendererDialog" :title="blueprint.name" />
    </div>
</template>

<script>
import { CheckCircleIcon, QuestionMarkCircleIcon } from '@heroicons/vue/outline'
import { defineAsyncComponent } from 'vue'
import { mapState } from 'vuex'

import ProjectIcon from '../../components/icons/Projects.js'
import { useNavigationHelper } from '../../composables/NavigationHelper.js'
import product from '../../services/product.js'
import FfDialog from '../../ui-components/components/DialogBox.vue'
import FormRow from '../FormRow.vue'
import AssetDetailDialog from '../dialogs/AssetDetailDialog.vue'

export default {
    name: 'BlueprintTile',
    components: {
        FfDialog,
        FormRow,
        AssetDetailDialog,
        CheckCircleIcon,
        ProjectIcon
    },
    props: {
        blueprint: {
            required: true,
            type: Object
        },
        editable: {
            type: Boolean,
            default: false
        },
        displayPreviewButton: {
            type: Boolean,
            default: true
        },
        displayExternalUrlButton: {
            type: Boolean,
            default: false
        },
        active: {
            type: Boolean,
            default: false
        }
    },
    emits: ['selected'],
    setup () {
        const { openInANewTab } = useNavigationHelper()
        return {
            openInANewTab
        }
    },
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

<style lang="scss">
.ff-blueprint-tile {
  background-color: $ff-white;
  width: 250px;

  &.active {
    border-color: $ff-blue-600;
    transition: border-color .3s;
  }

  .ff-dialog-container {
    .ff-dialog-box {
      max-width: 75rem;
      .ff-dialog-content {
        padding: 0;
      }
      .ff-dialog-actions {
        padding: 5px 15px;
      }
    }
  }
}
</style>
