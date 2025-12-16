<template>
    <div class="maintenance">
        <section data-el="scheduled-upgrade" class="scheduled-upgrade">
            <FeatureUnavailable v-if="!isInstanceAutoStackUpdateFeatureEnabledForPlatform" />
            <FormHeading>Scheduled Restarts/Upgrades</FormHeading>
            <FormRow v-model="scheduledUpgrade.enabled" :disabled="!allowDisable" type="checkbox" class="mt-5" container-class="max-w-xl">
                Enabled
                <template #description>
                    Select the days of the week and the hour during which the automatic upgrade will occur if available. The upgrade will start within the selected hour.
                </template>
            </FormRow>
            <FormRow v-model="scheduledUpgrade.restart" :disabled="!scheduledUpgrade.enabled" type="checkbox">
                Restart even if no update available
                <template #description>
                    This will trigger a Node-RED restart even if no update is available.
                </template>
            </FormRow>
            <p class="my-3"><span class="font-bold">Note:</span> All times are stated in UTC.</p>
            <div class="my-5 flex flex-col gap-5 max-w-xl">
                <!-- <pre>{{ scheduledUpgrade }}</pre> -->
                <ul class="days-selector flex flex-row flex-wrap justify-start gap-3">
                    <li
                        v-for="weekDay in weekDays"
                        :key="weekDay.id"
                        class="day-selector"
                        :class="{disabled: !scheduledUpgrade.enabled, selected: (scheduledUpgrade.selectedWeekdays ?? []).includes(weekDay.id)}"
                        :title="weekDay.label"
                        @click="onScheduledUpgradeDaySelected(weekDay.id)"
                    >
                        <span>
                            {{ weekDay.label.slice(0, 3) }}
                        </span>
                    </li>
                </ul>
                <div class="time-selector">
                    <DateTimePicker
                        v-model="scheduledUpgrade.startHour"
                        :disabled="!scheduledUpgrade.enabled"
                        :class="{disabled: !scheduledUpgrade.enabled}"
                        :time-config="timeConfig"
                        is24
                        time-picker
                        vertical
                        ignoreTimeValidation
                        hoursGridIncrement
                        :enableMinutes="false"
                        placeholder="Time Range"
                        timezone="UTC"
                        :format="format"
                        :min-time="{ hours: 0, minutes: 0, seconds: 0 }"
                        :start-time="{ hours: 0, minutes: 0, seconds: 0 }"
                    />
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import { mapState } from 'vuex'

import instanceApi from '../../../api/instances.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import featuresMixin from '../../../mixins/Features.js'
import Alerts from '../../../services/alerts.js'
import DateTimePicker from '../../../ui-components/components/form/DateTime.vue'

export default {
    name: 'InstanceSettingsMaintenance',
    components: {
        DateTimePicker,
        FeatureUnavailable,
        FormRow,
        FormHeading
    },
    mixins: [featuresMixin],
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['save-button-state'],
    data () {
        return {
            scheduledUpgrade: {
                enabled: false,
                restart: false,
                startHour: null,
                selectedWeekdays: [],
                initialValue: null
            },
            weekDays: [
                {
                    id: 0,
                    label: 'Sunday'
                },
                {
                    id: 1,
                    label: 'Monday'
                },
                {
                    id: 2,
                    label: 'Tuesday'
                },
                {
                    id: 3,
                    label: 'Wednesday'
                },
                {
                    id: 4,
                    label: 'Thursday'
                },
                {
                    id: 5,
                    label: 'Friday'
                },
                {
                    id: 6,
                    label: 'Saturday'
                }
            ],
            unsavedChanges: false,
            timeConfig: {
                noHoursOverlay: false,
                minutesIncrement: 60,
                secondsIncrement: 60,
                startTime: {
                    hours: 0,
                    minutes: 0
                }
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'team', 'settings']),
        saveButton () {
            return {
                visible: true,
                disabled: !this.unsavedChanges
            }
        },
        allowDisable () {
            // Team can disable if the autoStackUpdate flag is not explicitly false
            return !this.scheduledUpgrade.enabled || this.team.type.properties?.autoStackUpdate?.allowDisable !== false
        }
    },
    watch: {
        saveButton: {
            immediate: true,
            handler (state) {
                this.$emit('save-button-state', state)
            }
        },
        scheduledUpgrade: {
            deep: true,
            handler: function () {
                this.evaluateChanges()
            }
        },
        'scheduledUpgrade.enabled': function (value) {
            // resetting values if toggling feature on/off
            if (!value) {
                // this.scheduledUpgrade.startHour = null
                // this.scheduledUpgrade.selectedWeekdays = []
            } else if (value && this.scheduledUpgrade.initialValue) {
                if (this.scheduledUpgrade.initialValue?.hour) {
                    this.scheduledUpgrade.startHour = {
                        hours: this.scheduledUpgrade.initialValue.hour,
                        minutes: 0,
                        seconds: 0
                    }
                }
                this.scheduledUpgrade.selectedWeekdays = [...this.scheduledUpgrade.initialValue?.days] ?? []
                if (Object.prototype.hasOwnProperty.call(this.scheduledUpgrade.initialValue, 'hour')) {
                    this.scheduledUpgrade.startHour = {
                        hours: this.scheduledUpgrade.initialValue.hour ?? 14,
                        minutes: 0,
                        seconds: 0
                    }
                }
            }
        }
    },
    async mounted () {
        await this.getUpdateSchedule()
    },
    methods: {
        format (date) {
            if (!date) return ''

            if (!this.scheduledUpgrade.startHour) return 'Select a time range'

            const utc = new Date(Date.UTC(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                date.getHours(),
                date.getMinutes()
            ))

            const startHours = utc.getUTCHours()
            const endHours = (startHours + 1) % 24

            const startTime = `${String(startHours).padStart(2, '0')}:00`
            const endTime = `${String(endHours).padStart(2, '0')}:00`

            return `Between ${startTime} and ${endTime}`
        },
        onScheduledUpgradeDaySelected (id) {
            if (!this.scheduledUpgrade.enabled) return

            if (this.scheduledUpgrade.selectedWeekdays.includes(id)) {
                const index = this.scheduledUpgrade.selectedWeekdays.indexOf(id)
                this.scheduledUpgrade.selectedWeekdays.splice(index, 1)
            } else {
                this.scheduledUpgrade.selectedWeekdays.push(id)
            }
        },
        getUpdateSchedule () {
            return instanceApi.getUpdateSchedule(this.project.id)
                .then(response => {
                    this.scheduledUpgrade.initialValue = {
                        days: response.map(entry => entry.day),
                        hour: response[0].hour, // use the first entry hour, they should all be the same
                        restart: response[0].restart // use the first entry restart, they should all be the same
                    }
                    this.scheduledUpgrade.initialValue.enabled = true

                    this.scheduledUpgrade.selectedWeekdays = response.map(entry => entry.day)
                    this.scheduledUpgrade.startHour = {
                        hours: response[0].hour, // use the first entry hour, they should all be the same
                        minutes: 0,
                        seconds: 0
                    }
                    this.scheduledUpgrade.enabled = true
                    this.scheduledUpgrade.restart = response[0].restart // use the first entry restart, they should all be the same
                }).catch(error => {
                    if (error.response.status === 404) {
                        // Apply any defaults from the team type
                        if (this.team.type.properties.autoStackUpdate?.days?.length > 0 && this.team.type.properties.autoStackUpdate?.hours?.length > 0) {
                            this.scheduledUpgrade.initialValue = {
                                enabled: false,
                                restart: false
                            }
                            this.scheduledUpgrade.selectedWeekdays = [...this.team.type.properties.autoStackUpdate.days]
                            this.scheduledUpgrade.initialValue.days = [...this.team.type.properties.autoStackUpdate.days]
                            this.scheduledUpgrade.startHour = {
                                hours: this.team.type.properties.autoStackUpdate.hours[Math.round(this.team.type.properties.autoStackUpdate.hours.length * Math.random())],
                                minutes: 0,
                                seconds: 0
                            }
                            this.scheduledUpgrade.initialValue.hour = this.scheduledUpgrade.startHour.hours
                        } else {
                            this.scheduledUpgrade.initialValue = {
                                enabled: false,
                                days: []
                            }
                            this.scheduledUpgrade.startHour = null
                            this.scheduledUpgrade.initialValue = {
                                enabled: false,
                                restart: false
                            }
                        }
                        return
                    }
                    throw error
                })
        },
        evaluateChanges () {
            const changes = []

            const daysChanged = !this.scheduledUpgrade.initialValue?.days?.every(day => this.scheduledUpgrade.selectedWeekdays.includes(day)) || this.scheduledUpgrade.initialValue?.days?.length !== this.scheduledUpgrade.selectedWeekdays.length
            const hoursChanged = this.scheduledUpgrade.initialValue?.hour !== this.scheduledUpgrade.startHour?.hours
            const mandatoryValues = this.scheduledUpgrade.selectedWeekdays.length === 0 || this.scheduledUpgrade.startHour === null

            changes.push(daysChanged)
            changes.push(hoursChanged)
            if (this.scheduledUpgrade.initialValue?.enabled !== this.scheduledUpgrade?.enabled) {
                // allow users to disable the schedule
                this.unsavedChanges = true
                return
            }

            if (this.scheduledUpgrade.restart !== this.scheduledUpgrade.initialValue.restart) {
                this.unsavedChanges = true
                return
            }

            if (mandatoryValues) {
                // disables the save button if values are missing
                this.unsavedChanges = false
                return
            }

            this.unsavedChanges = changes.some(e => e === true)
        },
        saveSettings () {
            if (this.scheduledUpgrade.enabled) {
                const schedule = this.scheduledUpgrade.selectedWeekdays.map(day => ({
                    hour: this.scheduledUpgrade.startHour.hours,
                    day,
                    restart: this.scheduledUpgrade.restart
                }))
                return instanceApi.setUpdateSchedule(this.project.id, schedule)
                    .then(() => {
                        this.scheduledUpgrade.initialValue = {
                            days: [...this.scheduledUpgrade.selectedWeekdays],
                            hour: this.scheduledUpgrade.startHour.hours,
                            restart: this.scheduledUpgrade.restart
                        }
                        this.scheduledUpgrade.initialValue.enabled = true
                        Alerts.emit('Schedule updated', 'confirmation')
                    }).catch(error => {
                        Alerts.emit('Failed to update schedule.', 'warning')
                        console.warn(error)
                    })
            } else {
                return instanceApi.removeUpdateSchedule(this.project.id)
                    .then(() => {
                        this.scheduledUpgrade.initialValue = null
                        this.scheduledUpgrade.selectedWeekdays = null
                        this.scheduledUpgrade.startHour = null
                        this.scheduledUpgrade.restart = false
                        this.scheduledUpgrade.initialValue.enabled = false
                        Alerts.emit('Schedule removed', 'confirmation')
                    }).catch(error => {
                        Alerts.emit('Failed to remove schedule', 'warning')
                        console.warn(error)
                    })
            }
        }
    }
}
</script>

<style scoped lang="scss">
.maintenance {
    .scheduled-upgrade {
        .days-selector {
            .day-selector {
                border: 1px solid $ff-indigo-200;
                background: $ff-indigo-50;
                padding: 5px 15px;
                border-radius: 4px;
                cursor: pointer;
                transition: ease-in-out .3s;
                flex: 1;
                position: relative;
                text-align: center;

                &:hover {
                    background: $ff-indigo-200;
                }

                &.selected {
                    background: $ff-indigo-400;
                    color: white;

                    span {
                        font-weight: 600;
                    }
                }

                &.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            }
        }
    }
}
</style>
