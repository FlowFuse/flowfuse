<template>
    <div class="ff-instance-assets">
        <div class="ff-breadcrumbs disable-last mb-7">
            <template v-if="breadcrumbs.length > 0">
                <span v-for="(crumb, $index) in breadcrumbs" :key="$index" class="flex mr-1 gap-1 items-center">
                    <span>/</span>
                    <label @click="breadcrumbClicked($index)">{{ crumb || 'Storage' }}</label>
                </span>
            </template>
            <span class="flex gap-1 items-center">
                <span>/</span>
                <label>{{ currentDirectory.name || 'Storage' }}</label>
                <span>/</span>
            </span>
        </div>
        <FileBrowser
            :breadcrumbs="breadcrumbs"
            :pwd="currentDirectory" :items="files"
            @items-updated="loadContents"
            @change-directory="changeDirectory"
        />
    </div>
</template>

<script>
import AssetsAPI from '../../api/assets.js'
import FileBrowser from '../../components/file-browser/FileBrowser.vue'
import permissionsMixin from '../../mixins/Permissions.js'

export default {
    name: 'InstanceAssets',
    components: {
        FileBrowser
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
    data () {
        // const breadcrumbs = this.$route.params.filePath
        // const dir = breadcrumbs.pop() || '/'
        return {
            breadcrumbs: [],
            // default current directory
            currentDirectory: {
                name: null
            },
            files: []
        }
    },
    mounted () {
        this.loadContents()
    },
    methods: {
        loadContents () {
            console.log('loading contents')
            const breadcrumbs = this.breadcrumbs.join('/')
            const path = breadcrumbs + (breadcrumbs.length > 0 ? '/' : '') + (this.currentDirectory.name || '')
            console.log('path', path)
            console.log('breadcrumbs', this.breadcrumbs)
            AssetsAPI.getFiles(this.instance.id, path)
                .then(files => {
                    this.files = files
                })
                .catch(error => {
                    console.log(error)
                })
        },
        changeDirectory (dir) {
            console.log(dir, this.currentDirectory)
            this.breadcrumbs.push(this.currentDirectory.name || '')
            this.currentDirectory.name = dir.name
            this.loadContents()
        },
        breadcrumbClicked ($index) {
            console.log($index, this.breadcrumbs)
            this.currentDirectory.name = this.breadcrumbs[$index] || ''
            this.breadcrumbs = this.breadcrumbs.slice(0, $index)
            console.log(this.breadcrumbs, this.currentDirectory)
            this.loadContents()
        }
    }
}
</script>

<style>
</style>
