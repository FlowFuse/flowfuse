<template>
    <section class="ff-select-application-step text-center flex flex-col gap-4 pt-6" data-step="application">
        <template v-if="hasApplications">
            <h2>Choose an Application</h2>

            <p>Applications are used to manage and group together your Node-RED Instances and resources.</p>

            <div v-if="applications.length > 5" class="search-wrapper flex justify-center my-2">
                <ff-text-input
                    v-model="searchTerm" class="ff-data-table--search max-w-2xl w-full col-span-3 relative"
                    data-form="search" placeholder="Search applications"
                >
                    <template #icon><SearchIcon /></template>
                    <template #icon-right>
                        <x-icon
                            v-if="searchTerm.length"
                            class="ff-icon ff-icon-sm absolute right-0 top-o z-10 text-gray-600 mr-1 transition-all duration-300 ease-in-out cursor-pointer"
                            @click="searchTerm = ''"
                        />
                    </template>
                </ff-text-input>
            </div>

            <ul class="max-w-2xl w-full m-auto text-left flex flex-col gap-4">
                <li
                    v-for="(application, $key) in filteredApplications"
                    :key="$key"
                    class="app-tile flex flex-col gap-2"
                    :class="{selected: application.id === selection?.id}"
                    data-el="application-item"
                    @click="selectApplication(application)"
                >
                    <div class="header flex justify-between gap-2 items-center">
                        <h5 class="title truncate">
                            {{ application.label }}
                        </h5>
                        <div class="counters flex gap-4 items-center">
                            <div title="Number Of Hosted Instances" class="remote flex gap-1 justify-between truncate items-center">
                                <IconNodeRedSolid class="ff-icon ff-icon-sm text-red-800" />
                                <span class="counter">{{ application.counters.instances }}</span>
                            </div>
                            <div class="hosted flex gap-1 justify-between truncate items-center">
                                <IconDeviceSolid title="Number of Remote Instances" class="ff-icon ff-icon-sm text-teal-700" />
                                <span class="counter">{{ application.counters.devices }}</span>
                            </div>
                        </div>
                    </div>
                    <div v-if="application.description && application.description.length > 0" class="description" :title="application.description">
                        <hr>
                        <p class="pt-2">
                            {{ application.description }}
                        </p>
                    </div>
                </li>
            </ul>
        </template>
        <template v-else>
            <h2>Create an Application</h2>

            <p>Applications are used to manage and group together your Node-RED instances.</p>

            <div class="max-w-lg w-full m-auto text-left flex flex-col gap-4">
                <FormRow
                    v-model="input.name"
                    containerClass="none"
                    placeholder="Application Name"
                    data-form="application-name"
                >
                    <template #default>
                        Application Name
                    </template>
                </FormRow>

                <FormRow
                    containerClass="none"
                    placeholder="Application Description"
                    data-form="application-description"
                    type="text"
                >
                    <template #default>
                        Application Description
                    </template>
                    <template #input>
                        <textarea v-model="input.description" placeholder="Application Description" class="w-full flex-co" />
                    </template>
                </FormRow>

                <FormRow
                    v-if="showInstanceFollowUp"
                    v-model="input.createInstance"
                    containerClass="none"
                    wrapper-class="flex-col"
                    data-form="create-instance"
                    type="checkbox"
                >
                    <template #default>
                        Create Node-RED Instance
                    </template>
                    <template #append>
                        <span class="ff-description">
                            This will create an instance of Node-RED that will be managed in your new Application.
                        </span>
                    </template>
                </FormRow>
            </div>
        </template>
    </section>
</template>

<script>
import { SearchIcon, XIcon } from '@heroicons/vue/outline'

import FormRow from '../../../FormRow.vue'
import IconDeviceSolid from '../../../icons/DeviceSolid.js'

import IconNodeRedSolid from '../../../icons/NodeRedSolid.js'

export default {
    name: 'ApplicationStep',
    components: { FormRow, IconDeviceSolid, IconNodeRedSolid, SearchIcon, XIcon },
    props: {
        slug: {
            required: true,
            type: String
        },
        state: {
            required: false,
            type: Object,
            default: () => ({})
        },
        applications: {
            required: true,
            type: Array
        },
        instanceFollowUp: {
            required: false,
            type: Boolean,
            default: false
        },
        showInstanceFollowUp: {
            required: false,
            type: Boolean,
            default: false
        }
    },
    emits: ['step-updated', 'next-step'],
    setup (props) {
        return {
            initialState: props.state
        }
    },
    data () {
        return {
            selection: this.initialState.selection ?? null,
            input: {
                name: this.initialState?.input?.name ?? '',
                description: this.initialState?.input?.description ?? '',
                createInstance: this.initialState?.input?.createInstance ?? true
            },
            searchTerm: ''
        }
    },
    computed: {
        hasApplications () {
            return this.applications.length > 0
        },
        filteredApplications () {
            if (!this.searchTerm.length) return this.applications

            return this.applications.filter(app => app.label.toLowerCase().includes(this.searchTerm.toLowerCase()))
        }
    },
    watch: {
        selection: {
            handler (selection) {
                if (!this.hasApplications) {
                    return
                }

                // When we have applications at our disposal we react when we select different applications
                let hasErrors = false
                const errors = []

                if (this.selection === null) {
                    hasErrors = true
                    errors.push('An application is required')
                }

                this.$emit('step-updated', {
                    [this.slug]: {
                        selection,
                        hasErrors,
                        errors
                    }
                })
            },
            deep: true,
            immediate: true
        },
        input: {
            handler (input) {
                if (this.hasApplications) {
                    return
                }

                // When we don't have applications at our disposal we react when we fill in the input form
                let hasErrors = false
                const errors = []

                if (input.name.length === 0) {
                    hasErrors = true
                    errors.push('The application name is a required field')
                }

                this.$emit('step-updated', {
                    [this.slug]: {
                        input,
                        hasErrors,
                        errors
                    }
                })
            },
            deep: true,
            immediate: true
        }
    },
    methods: {
        selectApplication (application) {
            if (this.selection?.id === application?.id && (this.applications && this.applications.length > 1)) {
                this.selection = null
            } else {
                this.selection = application
                this.$nextTick(() => {
                    this.$emit('next-step')
                })
            }
        }
    }
}
</script>

<style scoped lang="scss">
.ff-select-application-step {
    .app-tile {
        padding: 12px;
        border: 2px solid $ff-grey-300;
        width: 100%;
        border-radius: 6px;
        cursor: pointer;
        transition: ease-in-out .3s;

        &:hover {
            border-color: $ff-indigo-400;
        }

        &.selected {
            border-color: $ff-indigo-600;
        }

        .header {
            .title {

            }

            .counters {
                color: $ff-grey-400;
                font-size: $ff-funit-xs;
            }
        }

        .description {
            color: $ff-grey-400;
            font-size: $ff-funit-sm;
        }
    }
}
</style>
