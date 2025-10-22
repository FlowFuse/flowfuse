<template>
    <section data-el="add-device-to-group-dialog">
        <transition name="fade" mode="out-in">
            <ff-loading v-if="loading" />

            <div v-else class="flex flex-col gap-8">
                <div class="flex flex-col gap-4">
                    <div class="title">
                        <h3 v-if="devices && !devicesBelongToSameApplication">
                            Unable to assign device to group.
                        </h3>
                        <h3 v-else>Select a group from {{ application? application.name : device.application.name }}</h3>
                    </div>

                    <ff-combobox
                        v-if="devicesBelongToSameApplication" v-model="selected"
                        :options="deviceGroups" label-key="name" value-key="id"
                    >
                        <template #option="{ option, selected, active }">
                            <li :class="{selected, active}">
                                <div class="ff-option-content flex flex-col !gap-2 !items-start">
                                    <div class="title flex justify-between w-full items-center">
                                        <span class="truncate bold flex-1">{{ option.name }}</span>
                                        <span class="truncate text-gray-500 flex gap-1 items-center">
                                            <ChipIcon class="ff-icon ff-icon-sm" />
                                            {{ option.deviceCount }}
                                        </span>
                                    </div>
                                    <div
                                        v-if="option.description"
                                        class="description italic text-gray-400 clipped-overflow--two-lines"
                                    >
                                        <p :title="option.description">
                                            {{ option.description }}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        </template>
                    </ff-combobox>
                </div>

                <notice-banner v-if="devicesBelongToSameApplication" :text="assignmentNoticeText" />

                <notice-banner
                    v-if="devices && !devicesBelongToSameApplication"
                    text="Selected Remote Instances must belong to the same application in order to assign them to a group."
                />
            </div>
        </transition>
    </section>
</template>

<script>
import { ChipIcon } from '@heroicons/vue/outline'
import { mapActions } from 'vuex'

import ApplicationAPI from '../../api/application.js'
import { pluralize } from '../../composables/String.js'
import FfLoading from '../Loading.vue'
import NoticeBanner from '../banners/NoticeBanner.vue'

export default {
    name: 'AddDeviceToGroupDialog',
    components: {
        NoticeBanner,
        FfLoading,
        ChipIcon
    },
    props: {
        device: {
            type: Object,
            required: false,
            default: null
        },
        devices: {
            type: Array,
            required: false,
            default: () => []
        }
    },
    emits: ['selected'],
    data () {
        return {
            application: null,
            loading: true,
            deviceGroups: [],
            selected: null,
            devicesBelongToSameApplication: true
        }
    },
    computed: {
        assignmentNoticeText () {
            if (this.devices.length > 2) {
                return 'These Remote Instances will be updated to deploy the selected groups active pipeline snapshot.'
            }

            return 'This Remote Instance will be updated to deploy the selected groups active pipeline snapshot.'
        }
    },
    watch: {
        selected () {
            this.$emit('selected', this.selected)
            if (this.device) {
                this.setDisablePrimary((this.device.deviceGroup?.id ?? null) === this.selected)
            } else if (this.devices.length > 0) {
                this.setDisablePrimary(this.selected === null)
            }
        }
    },
    mounted () {
        this.validateDeviceApplicationOwnership()
            .then(() => this.getDeviceGroups())
            .catch(e => e)
            .finally(() => {
                this.loading = false
            })
    },
    methods: {
        pluralize,
        ...mapActions('ux/dialog', ['setDisablePrimary']),
        async getDeviceGroups () {
            return ApplicationAPI.getDeviceGroups(this.devices.length ? this.application.id : this.device.application.id)
                .then((groups) => {
                    this.deviceGroups = groups.groups
                    if (this.device?.deviceGroup) {
                        this.selected = this.device.deviceGroup.id
                    }
                    if (this.device) {
                        this.setDisablePrimary((this.device?.deviceGroup?.id ?? null) === this.selected)
                    }
                })
                .catch((err) => {
                    console.error(err)
                })
        },
        validateDeviceApplicationOwnership () {
            return new Promise((resolve, reject) => {
                if (this.devices.length > 0) {
                    const map = {}
                    this.devices.forEach((device) => {
                        map[device.application?.id ?? ''] = ''
                    })
                    const keys = Object.keys(map)

                    if (keys.some(key => key === '')) {
                        this.devicesBelongToSameApplication = false
                        return reject(new Error('Some Remote Instances do not belong to an application'))
                    }

                    this.devicesBelongToSameApplication = keys.filter(key => key)
                        .length === 1

                    if (this.devicesBelongToSameApplication) {
                        this.application = this.devices[0].application
                    } else {
                        reject(new Error('Remote Instances do not belong to the same application'))
                    }
                    this.setDisablePrimary(true)
                }

                resolve()
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
