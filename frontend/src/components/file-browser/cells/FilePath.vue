<template>
    <div v-if="type === 'file'" class="ff-row-file--copy" @click="copyPath">
        {{ path }}
        <DuplicateIcon class="ff-icon" />
        <span ref="copied" class="ff-copied">Copied!</span>
    </div>
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
            required: true,
            type: String
        },
        name: {
            required: true,
            type: String
        },
        pwd: {
            required: true,
            type: String
        }
    },
    computed: {
        path () {
            const path = this.pwd + this.name
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
        cursor: pointer;
        color: $ff-blue-600;
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
</style>
