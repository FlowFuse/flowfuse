<template>
    <ff-dropdown :disabled="isRootFolder">
        <template #placeholder>
            <div v-if="isCurrentFolderPublic" class="flex gap-2"><GlobeAltIcon class="ff-icon" /> Public</div>
            <div v-else class="flex gap-2"><ProjectIcon class="ff-icon" /> Node-RED Only</div>
        </template>
        <template #default>
            <ff-dropdown-option data-action="select-private" :disabled="!isCurrentFolderPublic" @click="selected('private')">
                <div class="flex gap-2"><ProjectIcon class="ff-icon" /> Node-RED Only</div>
            </ff-dropdown-option>
            <ff-dropdown-option data-action="select-public" @click="showStaticPathSelectionDialog">
                <div class="flex gap-2"><GlobeAltIcon class="ff-icon" /> Public</div>
            </ff-dropdown-option>
        </template>
    </ff-dropdown>
    <ff-dialog
        ref="selectStaticPath" data-el="select-static-path-dialog"
        header="Select a static path"
        :disablePrimary="staticPath.length === 0"
        @confirm="confirmStaticPath"
    >
        <p style="margin-bottom: 12px">
            Please set the static path mapping
        </p>
        <ff-text-input v-model="staticPath" placeholder="Static Path" />
    </ff-dialog>
</template>

<script>
import { GlobeAltIcon } from '@heroicons/vue/outline'

import ProjectIcon from '../../components/icons/Projects.js'
export default {
    name: 'VisibilitySelector',
    components: { ProjectIcon, GlobeAltIcon },
    inheritAttrs: false,
    props: {
        breadcrumbs: {
            type: Array,
            required: true
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
                this.selected('public', this.staticPath)
                this.staticPath = ''
            }
        }
    }

}
</script>

<style lang="scss">
.ff-dropdown {
  min-width: 130px;

  .ff-dropdown-selected {
    padding-left: 0;
    padding-right: 0;
    border: none;
  }

  .ff-dropdown-options {
    border: 1px solid $ff-grey-200 !important;

    .ff-dropdown-option {
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
