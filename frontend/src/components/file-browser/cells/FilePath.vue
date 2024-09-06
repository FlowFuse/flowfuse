<template>
    <div v-if="!isNotAvailable" class="ff-row-file--copy">
        <span class="path" :title="path">{{ path }}</span>
        <DuplicateIcon class="ff-icon" @click="copyPath" @click.prevent.stop />
        <span ref="copied" class="ff-copied">Copied!</span>
    </div>
    <span v-else class="not-available">Not Available</span>
</template>

<script>

import { DuplicateIcon } from '@heroicons/vue/outline'

export default {
    name: 'FileBrowserCellFilePath',
    components: {
        DuplicateIcon
    },
    inheritAttrs: false,
    props: {
        type: {
            required: false,
            type: String,
            default: 'file'
        },
        name: {
            required: false,
            type: String,
            default: ''
        },
        breadcrumbs: {
            default: () => [],
            type: Array
        },
        prepend: {
            required: false,
            default: '',
            type: String
        },
        isNotAvailable: {
            required: false,
            default: false,
            type: Boolean
        }
    },
    computed: {
        path () {
            const path = [this.prepend, ...this.breadcrumbs.map(crumb => crumb.name), this.name].join('/')
            // clear leading slash
            return path.replace(/^\//, '')
        }
    },
    methods: {
        copyPath () {
            navigator.clipboard.writeText(this.path)

            // show "Copied" notification
            this.$refs.copied.style.display = 'inline'
            // hide after 500ms
            setTimeout(() => {
                this.$refs.copied.style.display = 'none'
            }, 500)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-row-file--copy {
    position: relative;
    &:hover {
        color: $ff-blue-600;
    }

  .ff-icon {
    &:hover {
      cursor: pointer;
    }
  }
}

.ff-copied {
    background-color: black;
    color: white;
    padding: 3px;
    border-radius: 3px;
    position: absolute;
    margin-top: -3px;
    margin-left: 3px;
    display: none;
}

.not-available {
  opacity: .4;
}
</style>
