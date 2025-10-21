<template>
    <section data-el="add-device-to-group-dialog">
        <transition name="fade" mode="out-in">
            <ff-loading v-if="loading" />
            <div v-else class="flex flex-col gap-8">
                <div class="flex flex-col gap-4">
                    <h3>Select a group from {{ device.application.name }}</h3>

                    <ff-combobox v-model="selected" :options="deviceGroups" label-key="name" value-key="id">
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

                <div v-if="device.deviceGroup" class="notice flex gap-4 items-center">
                    <div>
                        <ExclamationIcon class="ff-icon ff-icon-lg text-yellow-500" />
                    </div>
                    <p>
                        This Remote Instance will be cleared of any active pipeline snapshot from the original group when reassigning to a new group.
                    </p>
                </div>
            </div>
        </transition>
    </section>
</template>

<script>
import { ChipIcon, ExclamationIcon } from '@heroicons/vue/outline'
import { mapActions } from 'vuex'

import ApplicationAPI from '../../api/application.js'
import FfLoading from '../Loading.vue'

export default {
    name: 'AddDeviceToGroupDialog',
    components: {
        FfLoading,
        ChipIcon,
        ExclamationIcon
    },
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['selected'],
    data () {
        return {
            loading: true,
            deviceGroups: [],
            selected: null
        }
    },
    watch: {
        selected () {
            this.$emit('selected', this.selected)
            this.setDisablePrimary((this.device.deviceGroup?.id ?? null) === this.selected)
        }
    },
    mounted () {
        this.getDeviceGroups()
    },
    methods: {
        ...mapActions('ux/dialog', ['setDisablePrimary']),
        async getDeviceGroups () {
            return ApplicationAPI.getDeviceGroups(this.device.application.id)
                .then((groups) => {
                    this.deviceGroups = groups.groups
                    if (this.device.deviceGroup) {
                        this.selected = this.device.deviceGroup.id
                    }
                    this.setDisablePrimary((this.device.deviceGroup?.id ?? null) === this.selected)
                })
                .catch((err) => {
                    console.error(err)
                }).finally(() => {
                    this.loading = false
                })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
