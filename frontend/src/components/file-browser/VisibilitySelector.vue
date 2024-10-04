<template>
    <ff-listbox :disabled="isDisabled" data-el="visibility-selector" class="ff-dropdown visibility-selector">
        <template #button>
            <div v-if="isCurrentFolderPublic" class="flex gap-2"><GlobeAltIcon class="ff-icon" /> Public</div>
            <div v-else class="flex gap-2"><ProjectIcon class="ff-icon" /> Node-RED Only</div>
        </template>
        <template #options>
            <ListboxOption
                class="ff-option"
                :class="[!isCurrentFolderPublic ? 'cursor-not-allowed bg-gray-200 text-gray-500' : '']"
                :disabled="!isCurrentFolderPublic"
                data-action="select-private"
                @click="selected('private')"
            >
                <li>
                    <div class="ff-option-content">
                        <div class="flex gap-2"><ProjectIcon class="ff-icon" /> Node-RED Only</div>
                    </div>
                </li>
            </ListboxOption>
            <ListboxOption class="ff-option" data-action="select-public" @click="showStaticPathSelectionDialog">
                <li>
                    <div class="ff-option-content">
                        <div class="flex gap-2"><GlobeAltIcon class="ff-icon" /> Public</div>
                    </div>
                </li>
            </ListboxOption>
        </template>
    </ff-listbox>
    <ff-dialog
        ref="selectStaticPath" data-el="select-static-path-dialog"
        header="Select a static path"
        :disablePrimary="staticPath.length === 0"
        @confirm="confirmStaticPath"
        @close="clearStaticPath"
    >
        <p>
            Please set the static path mapping
        </p>
        <div class="ff-description">
            <p>
                Setting one of the following paths is disabled as it may interfere with internal functionality:
            </p>
            <dl>
                <dt v-for="(restriction, key) in restrictedStaticFilePaths" :key="key">
                    <span class="code">/{{ restriction }}</span>
                </dt>
            </dl>
        </div>

        <ff-text-input v-model="staticPath" placeholder="Static Path" />
    </ff-dialog>
</template>

<script>
import { ListboxOption } from '@headlessui/vue'
import { GlobeAltIcon } from '@heroicons/vue/outline'

import ProjectIcon from '../../components/icons/Projects.js'
import { removeSlashes } from '../../composables/String.js'
import Alerts from '../../services/alerts.js'
import FfListbox from '../../ui-components/components/form/ListBox.vue'

export default {
    name: 'VisibilitySelector',
    components: {
        ListboxOption,
        FfListbox,
        ProjectIcon,
        GlobeAltIcon
    },
    inheritAttrs: false,
    props: {
        breadcrumbs: {
            type: Array,
            required: true
        },
        instance: {
            required: false,
            type: [Object],
            default: null
        }
    },
    emits: ['selected'],
    data () {
        return {
            staticPath: ''
        }
    },
    computed: {
        isRootFolder () {
            return this.breadcrumbs.length === 0
        },
        currentFolder () {
            if (this.breadcrumbs.length > 0) {
                return this.breadcrumbs[this.breadcrumbs.length - 1]
            }
            return null
        },
        isCurrentFolderPublic () {
            if (!this.currentFolder) {
                return false
            }

            return Object.prototype.hasOwnProperty.call(this.currentFolder, 'share') &&
                Object.prototype.hasOwnProperty.call(this.currentFolder.share, 'root')
        },
        restrictedStaticFilePaths () {
            const restrictions = [
                '/dashboard',
                '/ui'
            ]
            if (this.instance?.settings?.httpAdminRoot) {
                restrictions.push(this.instance?.settings?.httpAdminRoot)
            }

            return restrictions.map(restriction => removeSlashes(restriction))
        },
        isDisabled () {
            if (this.isRootFolder) {
                return true
            }

            return this.instance?.meta?.state !== 'running'
        }
    },
    methods: {
        selected (visibility, path) {
            if (visibility === 'private' && !this.isCurrentFolderPublic) {
                // do nothing
            } else this.$emit('selected', { visibility, path })
        },
        showStaticPathSelectionDialog () {
            this.$refs.selectStaticPath.show()
        },
        confirmStaticPath () {
            if (this.staticPath.length > 0) {
                const startingPath = this.staticPath
                    .split('/')
                    .filter(p => p)
                    .shift()
                if (!this.restrictedStaticFilePaths.includes(removeSlashes(startingPath))) {
                    this.selected('public', this.staticPath.replace(/^\//, ''))
                    this.clearStaticPath()
                } else {
                    Alerts.emit('Unable to set a restricted static path', 'warning')
                }
            } else Alerts.emit('Unable to set an empty static path', 'warning')
        },
        clearStaticPath () {
            this.staticPath = ''
        }
    }
}
</script>

<style lang="scss">
.ff-dropdown.visibility-selector {
  min-width: 130px;

  .ff-button {
    padding-left: 0;
    padding-right: 0;
    border: none;
    background: none !important;
  }

  .ff-options {
    border: 1px solid $ff-grey-200 !important;

    .ff-option {
      background: white !important;
      border: none !important;

      &[disabled="true"] {
        color: $ff-grey-600;
        cursor: not-allowed;
      }

      &:hover {
        background-color: $ff-grey-200 !important;
      }
    }
  }
}
</style>
