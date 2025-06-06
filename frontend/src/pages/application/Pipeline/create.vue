<template>
    <ff-loading
        v-if="loading"
        message="Creating Pipeline..."
    />
    <form
        v-else
        class="space-y-6"
        data-form="pipeline-form"
        @submit.prevent="create"
    >
        <SectionTopMenu
            :hero="'Create DevOps Pipeline'"
        />

        <div class="px-4 space-y-6">
            <!-- Form Description -->
            <div class="mb-6 text-sm text-gray-500">
                Create a DevOps Pipeline for linking Node-RED Instances together.
            </div>

            <!-- Pipeline Options -->
            <FormRow
                v-model="input.name"
                type="text"
                data-form="pipeline-name"
            >
                <template #default>
                    Pipeline name
                </template>
            </FormRow>

            <div class="flex flex-wrap gap-3 items-center">
                <ff-button
                    class="ff-btn--secondary"
                    @click="$router.back()"
                >
                    Cancel
                </ff-button>

                <ff-button
                    :disabled="!submitEnabled"
                    :data-action="'create-pipeline'"
                    type="submit"
                >
                    Create Pipeline
                </ff-button>
            </div>
        </div>
    </form>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import ApplicationsAPI from '../../../api/application.js'
import FormRow from '../../../components/FormRow.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import usePermissions from '../../../composables/Permissions.js'
import Alerts from '../../../services/alerts.js'

export default {
    name: 'CreatePipeline',
    components: {
        SectionTopMenu,
        FormRow
    },
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    data () {
        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            mounted: false,
            loading: false,
            input: {
                name: null
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        submitEnabled () {
            return this.input.name?.length > 0
        }
    },
    watch: {
        team: {
            immediate: true,
            handler (team) {
                if (team && !this.hasPermission('pipeline:create')) {
                    this.$router.replace({
                        name: 'ApplicationPipelines',
                        params: {
                            id: this.application.id
                        }
                    })
                }
            }
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async create () {
            this.loading = true
            try {
                await ApplicationsAPI.createPipeline(this.application.id, this.input.name)
                Alerts.emit('Pipeline successfully created.', 'confirmation')

                this.$router.push({
                    name: 'ApplicationPipelines',
                    params: {
                        id: this.application.id
                    }
                })
            } catch (error) {
                Alerts.emit('Failed to create Pipeline.', 'warning')
            }

            this.loading = false
        }
    }
}
</script>
