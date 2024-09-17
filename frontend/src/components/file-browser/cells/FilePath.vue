<template>
    <div v-if="!isNotAvailable" class="ff-row-file">
        <text-copier v-if="canBeCopied" :text="path">
            <span class="path" :title="path">{{ path }}</span>
        </text-copier>
        <span v-else class="path" :title="path">{{ path }}</span>
    </div>
    <span v-else class="not-available">Not Available</span>
</template>

<script>
import TextCopier from '../../TextCopier.vue'

export default {
    name: 'FileBrowserCellFilePath',
    components: {
        TextCopier
    },
    inheritAttrs: false,
    props: {
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
        },
        baseURL: {
            required: false,
            default: null,
            type: [String, null]
        },
        type: {
            required: true,
            type: String
        }
    },
    computed: {
        path () {
            if (this.baseURL && this.baseURL.length > 0) {
                const url = new URL(this.baseURL)
                return [url.origin, this.prepend, this.name].join('/')
            }
            const path = [
                this.prepend,
                ...this.breadcrumbs.map(crumb => crumb.name),
                this.name
            ].join('/')

            // clear leading slash
            return path.replace(/^\//, '')
        },
        canBeCopied () {
            return this.type === 'file' || this.type === 'url'
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
.ff-row-file {
    position: relative;
    display: flex;
    align-items: center;
    gap: 3px;
    &:hover {
        color: $ff-blue-600;
    }
}

.not-available {
  opacity: .4;
}
</style>
