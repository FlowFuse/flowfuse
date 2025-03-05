<template>
    <SectionTopMenu hero="Custom Node Catalog" info="Your Team's private Node catalog. Here you can publish private npm repositories for your team to use within your Node-RED Instances.">
        <template #tools>
            <ff-button @click="publish">Publish</ff-button>
        </template>
    </SectionTopMenu>
    {{ registry }}

    <PublishNodeDialog ref="publishNodeDialog" />
</template>

<script>
import { mapState } from 'vuex'

import TeamAPI from '../../../../api/team.js'

import SectionTopMenu from '../../../../components/SectionTopMenu.vue'

import PublishNodeDialog from './dialogs/PublishNode.vue'

export default {
    name: 'NodeRegistry',
    components: {
        SectionTopMenu,
        PublishNodeDialog
    },
    data () {
        return {
            registry: []
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    mounted () {
        this.loadRegistry()
    },
    methods: {
        async loadRegistry () {
            const registry = await TeamAPI.getTeamRegistry(this.team.id)
            this.registry = registry
        },
        publish () {
            this.$refs.publishNodeDialog.show()
        }
    }
}
</script>
