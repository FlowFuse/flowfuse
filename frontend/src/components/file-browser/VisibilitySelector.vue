<template>
    <ff-dropdown :disabled="isRootFolder">
        <template #placeholder>
            <div class="flex gap-2"><ProjectIcon class="ff-icon" /> Node-RED Only</div>
        </template>
        <template #default>
            <ff-dropdown-option data-action="select-private" @click="selected('private')">
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
        }
    },
    methods: {
        selected (visibility, path) {
            this.$emit('selected', { visibility, path })
        },
        showStaticPathSelectionDialog () {
            this.$refs.selectStaticPath.show()
        },
        confirmStaticPath () {
            this.selected('public', this.staticPath)
            this.staticPath = ''
        }
    }

}
</script>

<style scoped lang="scss">

</style>
