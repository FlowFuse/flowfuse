import ApplicationApi from '../api/application.js'
import alerts from '../services/alerts.js'

export default {
    data () {
        return {
            application: {},
            applicationInstances: new Map(),
            loading: {
                deleting: false,
                suspend: false
            }
        }
    },
    computed: {
        isLoading () {
            return this.loading.deleting || this.loading.suspend
        },
        instancesArray () {
            if (this.applicationInstances.size === 0) {
                return []
            }
            return Array.from(this.applicationInstances.values()).filter(el => el)
        }
    },
    watch: {
    },
    methods: {
        async updateApplication () {
            const applicationId = this.$route.params.id

            // See https://github.com/FlowFuse/flowfuse/issues/2929
            if (!applicationId) {
                return
            }

            try {
                this.applicationInstances = []
                this.application = await ApplicationApi.getApplication(applicationId)
                // Check to see if we have the right team loaded
                if (this.team?.slug !== this.application.team.slug) {
                    return
                }
                const instancesPromise = ApplicationApi.getApplicationInstances(applicationId) // To-do needs to be enriched with instance state
                const applicationInstances = await instancesPromise

                this.applicationInstances = new Map()
                applicationInstances.forEach(instance => {
                    this.applicationInstances.set(instance.id, instance)
                })

                // Not waited for, as loading status is slightly slower
                ApplicationApi
                    .getApplicationInstancesStatuses(applicationId)
                    .then((instanceStatuses) => {
                        instanceStatuses.forEach((instanceStatus) => {
                            this.applicationInstances.set(instanceStatus.id, {
                                ...this.applicationInstances.get(instanceStatus.id),
                                ...instanceStatus
                            })
                        })
                    })
                    .catch((err) => {
                        console.error(err)
                    })
            } catch (err) {
                this.$router.push({
                    name: 'page-not-found',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
            }
        },
        async deleteApplication () {
            this.loading.deleting = true

            try {
                await ApplicationApi.deleteApplication(this.application.id, this.team.id)
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'Applications' })
                alerts.emit('Application successfully deleted.', 'confirmation')
            } catch (err) {
                if (err.response.data.error) {
                    alerts.emit(`Application failed to delete: ${err.response.data.error}`, 'warning', 10000)
                } else {
                    alerts.emit('Application failed to delete', 'warning')
                }
            }

            this.loading.deleting = false
        }
    },
    async created () {

    }
}
