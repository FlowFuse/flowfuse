<template>
    <div class="maintenance">
        <section data-el="scheduled-upgrade" class="scheduled-upgrade">
            <FormHeading>Scheduled Upgrades</FormHeading>
            <FormRow v-model="scheduledUpgrade.enabled" type="checkbox" class="mt-5" container-class="max-w-xl">
                Apply Node-RED upgrades when available
                <template #description>
                    <p>
                        Select the day of the week and the hour during which the automatic upgrade will occur. The
                        upgrade will start at a random time within the selected hour.
                    </p>
                    <p class="my-3"><span class="font-bold">Note:</span> All times are stated in UTC.</p>
                </template>
            </FormRow>
            <div class="my-5 flex flex-col gap-5 max-w-xl">
                <ul class="days-selector flex flex-row flex-wrap justify-start gap-3">
                    <li
                        v-for="weekDay in weekDays"
                        :key="weekDay.id"
                        class="day-selector"
                        :class="{disabled: !scheduledUpgrade.enabled, selected: scheduledUpgrade.selectedWeekday === weekDay.id}"
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
                        :time-config="{ noHoursOverlay: false, minutesIncrement: 60, secondsIncrement: 60}"
                        is24
                        time-picker
                        vertical
                        ignoreTimeValidation
                        hoursGridIncrement
                        :enableMinutes="false"
                        placeholder="Time Range"
                        timezone="utc"
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
import instanceApi from '../../../api/instances.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import Alerts from '../../../services/alerts.js'
import DateTimePicker from '../../../ui-components/components/form/DateTime.vue'

export default {
    name: 'InstanceSettingsMaintenance',
    components: {
        DateTimePicker,
        FormRow,
        FormHeading
    },
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
                startHour: null,
                selectedWeekday: null,
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
            unsavedChanges: false
        }
    },
    computed: {
        saveButton () {
            return {
                visible: true,
                disabled: !this.unsavedChanges
            }
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
                this.scheduledUpgrade.startHour = null
                this.scheduledUpgrade.selectedWeekday = null
            } else if (value && this.scheduledUpgrade.initialValue) {
                if (this.scheduledUpgrade.initialValue?.hour) {
                    this.scheduledUpgrade.startHour = {
                        hours: this.scheduledUpgrade.initialValue.hour,
                        minutes: 0,
                        seconds: 0
                    }
                }
                this.scheduledUpgrade.selectedWeekday = this.scheduledUpgrade.initialValue?.day
            }
        }
    },
    async mounted () {
        await this.getUpdateSchedule()
    },
    methods: {
        format (date) {
            if (!date) return ''

            const format = {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC'
            }

            const startTime = new Date(Date.UTC(1970, 0, 1, date.getUTCHours(), 0, 0, 0))
                .toLocaleTimeString([], format)
            const endTime = new Date(Date.UTC(1970, 0, 1, date.getUTCHours() + 1, 0, 0))
                .toLocaleTimeString([], format)

            return `Between ${startTime} and ${endTime}`
        },
        onScheduledUpgradeDaySelected (id) {
            if (this.scheduledUpgrade.selectedWeekday === id) {
                this.scheduledUpgrade.selectedWeekday = null
            } else {
                this.scheduledUpgrade.selectedWeekday = id
            }
        },
        getUpdateSchedule () {
            return instanceApi.getUpdateSchedule(this.project.id)
                .then(response => {
                    this.scheduledUpgrade.initialValue = response
                    this.scheduledUpgrade.initialValue.enabled = true

                    this.scheduledUpgrade.selectedWeekday = response.day
                    this.scheduledUpgrade.startHour = { hours: response.hour, minutes: 0, seconds: 0 }
                    this.scheduledUpgrade.enabled = true
                }).catch(error => {
                    if (error.response.status === 404) {
                        this.scheduledUpgrade.initialValue = {
                            enabled: false
                        }
                        return
                    }
                    throw error
                })
        },
        evaluateChanges () {
            const changes = []

            const dayChanged = this.scheduledUpgrade.initialValue?.day !== this.scheduledUpgrade.selectedWeekday
            const hoursChanged = this.scheduledUpgrade.initialValue?.hour !== this.scheduledUpgrade.startHour?.hours
            const mandatoryValues = this.scheduledUpgrade.selectedWeekday === null || this.scheduledUpgrade.startHour === null

            changes.push(dayChanged)
            changes.push(hoursChanged)

            if (this.scheduledUpgrade.initialValue?.enabled && this.scheduledUpgrade?.enabled === false) {
                // allow users to disable the schedule
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
                return instanceApi.setUpdateSchedule(this.project.id, {
                    hour: this.scheduledUpgrade.startHour.hours,
                    day: this.scheduledUpgrade.selectedWeekday
                })
                    .then(() => {
                        this.scheduledUpgrade.initialValue = {
                            day: parseInt(this.scheduledUpgrade.selectedWeekday),
                            hour: parseInt(this.scheduledUpgrade.startHour.hours)
                        }
                        Alerts.emit('Schedule updated', 'confirmation')
                    }).catch(error => {
                        Alerts.emit('Failed to update schedule.', 'warning')
                        console.warn(error)
                    })
            } else {
                return instanceApi.removeUpdateSchedule(this.project.id)
                    .then(() => {
                        this.scheduledUpgrade.initialValue = null
                        this.scheduledUpgrade.selectedWeekday = null
                        this.scheduledUpgrade.startHour = null
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
