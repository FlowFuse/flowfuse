<template>
    <div class="ff-chart space-y-2">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
                <h3>{{ label }}</h3>
                <label v-if="filter?.property === property" class="flex items-center gap-1 opacity-50">
                    <FilterIcon class="ff-icon ff-icon-sm" />
                    Filter Applied - {{ filter?.devices.length }} Device<template v-if="filter?.devices.length > 1">s</template>
                </label>
            </div>
            <button class="ff-btn ff-btn--tertiary" @click="toggle()">
                <EyeIcon v-if="visible" class="ff-icon" />
                <EyeOffIcon v-else class="ff-icon" />
            </button>
        </div>
        <div v-if="visible" class="ff-chart-device-status">
            <div
                v-for="(bucket, b) in buckets" :key="b"
                :class="'ff-chart-bar ff-chart-bar--' + b + ' ' + (((filter?.property === property) && (filter?.bucket && filter?.bucket !== b)) ? 'ghost' : '')"
                :style="{width: 100 * (bucket.devices.length/devices.length) + '%'}"
                @click="selected(b, bucket.devices)"
            >
                <div>{{ bucket.devices.length }}</div>
                <label>{{ bucket.label }}</label>
            </div>
        </div>
    </div>
</template>

<script>
import { EyeIcon, EyeOffIcon, FilterIcon } from '@heroicons/vue/outline'

import DeviceStatus from '../../services/device-status.js'

export default {
    name: 'DeviceStatusBar',
    components: {
        EyeIcon,
        EyeOffIcon,
        FilterIcon
    },
    props: {
        label: {
            required: true,
            type: String
        },
        devices: {
            required: true,
            type: Array
        },
        property: {
            required: true,
            type: String
        },
        filter: {
            required: true,
            type: [null, Object]
        }
    },
    emits: ['filter-selected'],
    data () {
        return {
            visible: true
        }
    },
    computed: {
        buckets () {
            let devices = []
            if (this.property === 'lastseen') {
                devices = this.devices.map((d) => {
                    return {
                        id: d.id,
                        bucket: DeviceStatus.lastSeenStatus(d.lastSeenAt, d.lastSeenMs)
                    }
                })
            } else if (this.property === 'status') {
                devices = this.devices.map((d) => {
                    return {
                        id: d.id,
                        bucket: {
                            class: d.status,
                            label: d.status
                        }
                    }
                })
            } else {
                throw Error(`Do not know how to filter on the property '${this.property}'`)
            }
            const buckets = {}
            devices.forEach((d) => {
                if (!buckets[d.bucket.class]) {
                    buckets[d.bucket.class] = {
                        label: d.bucket.label,
                        devices: []
                    }
                }
                buckets[d.bucket.class].devices.push(d.id)
            })
            return buckets
        }
    },
    methods: {
        selected (bucket, devices) {
            if (this.filter?.bucket === bucket) {
                this.$emit('filter-selected', null)
            } else {
                this.$emit('filter-selected', {
                    property: this.property, bucket, devices
                })
            }
        },
        toggle () {
            this.visible = !this.visible
        }
    }
}
</script>
