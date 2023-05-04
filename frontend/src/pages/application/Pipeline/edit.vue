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
        <ff-loading
            v-if="loading"
            message="Loading Devices..."
        />
        <form
            v-else
            class="space-y-6"
            @submit.prevent="create"
        >
            <SectionTopMenu
                :hero="'Create DevOps Pipeline'"
            />

            <!-- Form Description -->
            <div class="mb-8 text-sm text-gray-500">
                Create a DevOps Piepline for linking Node-RED Instances together.
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

            <div class="flex flex-wrap gap-1 items-center">
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
        </form>
    </main>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'

import ApplicationsAPI from '../../../api/application.js'
import FormRow from '../../../components/FormRow.vue'
import NavItem from '../../../components/NavItem.vue'
import SectionTopMenu from '../../../components/SectionTopMenu.vue'
import SideNavigation from '../../../components/SideNavigation.vue'
import Alerts from '../../../services/alerts.js'

export default {
    name: 'CreatePipeline',
    components: {
        SideNavigation,
        SectionTopMenu,
        NavItem,
        FormRow
    },
    props: {

    },
    data () {
        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            mounted: false,
            loading: false,
            input: {
                name
            }
        }
    },
    computed: {
        submitEnabled: () => {
            return true
        }
    },
    async mounted () {
        this.mounted = true
        console.log(this.$route.params.id)
    },
    methods: {
        async create () {
            this.loading = true
            await ApplicationsAPI.createPipeline(this.$route.params.id, this.input.name)
            Alerts.emit('Pipeline successfully created.', 'confirmation')
            this.loading = false
            this.$router.push({
                name: 'ApplicationPipelines',
                params: {
                    id: this.$route.params.id
                }
            })
        }
    }
}
</script>
