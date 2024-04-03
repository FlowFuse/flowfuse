<template class="flex flex-col">
    <ff-page>
        <section class="flex justify-center">
            <h2 class="text-center">>> iFrame goes here <<< </h2>
            <!-- <iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=dB5y&#45;&#45;0i-PhGJodt" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />-->
        </section>
    </ff-page>

    <section>
        <ff-page-header :tabs="navigation" />
        <ff-page>
            <router-view
                :instance="instance"
                :is-visiting-admin="isVisitingAdmin"
                @instance-updated="loadInstance"
                @instance-confirm-delete="showConfirmDeleteDialog"
                @instance-confirm-suspend="showConfirmSuspendDialog"
            />
        </ff-page>
    </section>
</template>

<script>

import FfPage from '../../../layouts/Page.vue'
import instanceMixin from '../../../mixins/Instance.js'
export default {
    name: 'InstanceEditor',
    components: { FfPage },
    mixins: [instanceMixin],
    data () {
        return {
            instance: {}
        }
    },
    computed: {
        navigation () {
            if (!this.instance.id) return []
            return [
                {
                    label: 'Overview',
                    to: { name: 'instance-editor-overview', params: { id: this.instance.id } },
                    tag: 'instance-overview'
                },
                {
                    label: 'Devices',
                    to: { name: 'instance-editor-devices', params: { id: this.instance.id } },
                    tag: 'instance-remote'
                },
                {
                    label: 'Snapshots',
                    to: { name: 'instance-editor-snapshots', params: { id: this.instance.id } },
                    tag: 'instance-snapshots'
                },
                {
                    label: 'Audit Log',
                    to: { name: 'instance-editor-audit-log', params: { id: this.instance.id } },
                    tag: 'instance-activity'
                },
                {
                    label: 'Node-RED Logs',
                    to: { name: 'instance-editor-logs', params: { id: this.instance.id } },
                    tag: 'instance-logs'
                },
                {
                    label: 'Settings',
                    to: { name: 'instance-editor-settings', params: { id: this.instance.id } },
                    tag: 'instance-settings'
                }
            ]
        }

    },
    mounted () {
        this.loadInstance()
    }
}
</script>

<style scoped lang="scss">

</style>
