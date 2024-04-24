import { mapState } from 'vuex'

import { Roles } from '../../../forge/lib/roles.js'
import InstanceApi from '../api/instances.js'
import SnapshotApi from '../api/projectSnapshots.js'
import { InstanceStateMutator } from '../utils/InstanceStateMutator.js'

import permissionsMixin from './Permissions.js'

export default {
    mixins: [permissionsMixin],
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        instanceRunning () {
            return this.instance?.meta?.state === 'running'
        },
        isVisitingAdmin: function () {
            return this.teamMembership?.role === Roles.Admin
        },
        isHA () {
            return this.instance?.ha?.replicas !== undefined
        }
    },
    data () {
        return {
            instance: {},
            loading: {
                deleting: false,
                suspend: false
            }
        }
    },
    watch: {
        instance: 'instanceChanged'
    },
    methods: {
        async loadInstance () {
            const instanceId = this.$route.params.id
            if (!instanceId) {
                return
            }
            try {
                const data = await InstanceApi.getInstance(instanceId)
                this.instance = { ...{ deviceSettings: {} }, ...this.instance, ...data }
                this.$store.dispatch('account/setTeam', this.instance.team.slug)
                this.instance.deviceSettings = await InstanceApi.getInstanceDeviceSettings(instanceId)
                if (this.instance.deviceSettings?.targetSnapshot) {
                    this.instance.targetSnapshot = await SnapshotApi.getSnapshot(instanceId, this.instance.deviceSettings.targetSnapshot)
                } else {
                    this.instance.targetSnapshot = null
                }
            } catch (err) {
                this.$router.push({
                    name: 'PageNotFound',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
            }
        },
        instanceUpdated (newData) {
            this.instanceStateMutator.clearState()
            this.instance = { ...this.instance, ...newData }
        },
        instanceChanged () {
            this.instanceStateMutator = new InstanceStateMutator(this.instance)
        },
        onInstanceDelete (payload) {
            this.loading.deleting = payload.status
        }
    },
    async created () {
        await this.loadInstance()

        this.$watch(
            () => this.$route.params.id,
            async () => {
                await this.loadInstance()
            }
        )
    }
}
