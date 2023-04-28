<template>
    <Teleport
        v-if="mounted"
        to="#platform-sidenav"
    >
        <SideNavigation>
            <template #options>
                <a @click="$router.back()">
                    <nav-item
                        :icon="icons.chevronLeft"
                        label="Back"
                    />
                </a>
            </template>
        </SideNavigation>
    </Teleport>
    <main>
        <div class="max-w-2xl m-auto">
            <ff-loading
                v-if="loading"
                message="Creating instance..."
            />
            <ff-loading
                v-else-if="sourceInstanceId && !sourceInstance"
                message="Loading instance to Copy From..."
            />
            <InstanceForm
                v-else
                :instance="instanceDetails"
                :source-instance="sourceInstance"
                :team="team"
                :applicationSelection="true"
                :applications="applications"
                :billing-enabled="!!features.billing"
                :submit-errors="errors"
                @on-submit="handleFormSubmit"
            />
        </div>
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import instanceApi from '../../api/instances.js'
import teamApi from '../../api/team.js'

import NavItem from '../../components/NavItem.vue'
import SideNavigation from '../../components/SideNavigation.vue'
import Alerts from '../../services/alerts.js'
import InstanceForm from '../instance/components/InstanceForm.vue'

export default {
    name: 'CreateInstance',
    components: {
        InstanceForm,
        NavItem,
        SideNavigation
    },
    beforeRouteEnter (to, from, next) {
        // we've got a user pressing "back" from the Create Application page,
        // but this page will very likely just bounce them back as they have
        // no applications. This breaks the cycle and redirects them back to Team > Applications
        if (from.name === 'CreateTeamApplication') {
            next('/')
        } else {
            next()
        }
    },
    inheritAttrs: false,
    data () {
        return {
            applications: null,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            loading: false,
            sourceInstance: null,
            mounted: false,
            errors: {
                name: ''
            },
            instanceDetails: null
        }
    },
    computed: {
        ...mapState('account', ['features', 'team'])
    },
    async created () {
        if (this.sourceInstanceId) {
            instanceApi.getInstance(this.sourceInstanceId).then(instance => {
                this.sourceInstance = instance
            }).catch(err => {
                console.error('Failed to load source instance', err)
            })
        }
        const data = await teamApi.getTeamApplications(this.team.id)
        this.applications = data.applications.map((a) => {
            return {
                label: a.name,
                value: a.id
            }
        })

        if (!this.applications.length) {
            // need to also create an Application
            this.$router.push({
                name: 'CreateTeamApplication',
                params: {
                    team_slug: this.team.slug
                }
            })
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async handleFormSubmit (formData, copyParts) {
            this.loading = true

            // Drop applicationId & applicationName from the payload
            const { applicationId, applicationName, ...instanceFields } = formData

            try {
                const instance = await this.createInstance(applicationId, instanceFields, copyParts)

                await this.$store.dispatch('account/refreshTeam')

                this.$router.push({ name: 'Instance', params: { id: instance.id } })
            } catch (err) {
                this.instanceDetails = instanceFields
                if (err.response?.status === 409) {
                    this.errors.name = err.response.data.error
                } else if (err.response?.status === 400) {
                    Alerts.emit('Failed to create instance: ' + err.response.data.error, 'warning', 7500)
                } else {
                    Alerts.emit('Failed to create instance')
                    console.error(err)
                }
            }

            this.loading = false
        },
        createInstance (applicationId, instanceDetails, copyParts) {
            const createPayload = { ...instanceDetails, applicationId }
            if (this.sourceInstance?.id) {
                createPayload.sourceProject = {
                    id: this.sourceInstanceId,
                    options: { ...copyParts }
                }
            }

            return instanceApi.create(createPayload)
        }
    }
}
</script>
