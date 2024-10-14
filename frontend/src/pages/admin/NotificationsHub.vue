<template>
    <div class="clear-page-gutters">
        <div class="ff-instance-header">
            <ff-page-header title="Notifications Hub" />
        </div>
        <div class="px-3 py-3 md:px-6 md:py-6">
            <form class="flex flex-col gap-5" @submit.prevent>
                <section class="flex gap-10">
                    <section>
                        <FormRow v-model="form.title" type="input" placeholder="Title" class="mb-5">
                            Announcement Title
                            <template #description>Enter a concise title for your announcement.</template>
                        </FormRow>
                        <FormRow v-model="form.message" class="mb-5">
                            Announcement Text
                            <template #description>Provide the details of your announcement.</template>
                            <template #input><textarea v-model="form.message" class="w-full max-h-80 min-h-40" rows="4" /></template>
                        </FormRow>
                        <FormRow v-model="form.url" type="input" :placeholder="urlPlaceholder" class="mb-5">
                            URL Link
                            <template #description>Provide an url where users will be redirected when they click on the notification.</template>
                        </FormRow>
                        <ff-checkbox v-model="form.externalUrl">
                            External URL
                        </ff-checkbox>
                    </section>
                    <section>
                        <label class="block text-sm font-medium mb-1">Audience</label>
                        <div class="ff-description mb-2 space-y-1">Select the audience of your announcement.</div>

                        <label class="block text-sm font-medium mb-2">By User Roles</label>
                        <label v-for="(role, $key) in roleIds" :key="$key" class="ff-checkbox mb-2" @keydown.space.prevent="toggleRole(role)">
                            <span ref="input" class="checkbox" :checked="form.roles.includes(role)" tabindex="0" @keydown.space.prevent="console.log(2)" />
                            <input v-model="form.roles" type="checkbox" :value="role" @keydown.space.prevent="console.log(3)">
                            {{ role }}
                        </label>
                    </section>
                </section>
                <section class="actions">
                    <ff-button :disabled="!canSubmit" @click.stop.prevent="submitForm"> Send Announcement </ff-button>
                </section>
            </form>
        </div>
    </div>
</template>

<script>
import adminApi from '../../api/admin.js'
import FormRow from '../../components/FormRow.vue'
import alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
import FfButton from '../../ui-components/components/Button.vue'
import FfCheckbox from '../../ui-components/components/form/Checkbox.vue'
import { RoleNames, Roles } from '../../utils/roles.js'

export default {
    name: 'NotificationsHub',
    components: { FfCheckbox, FfButton, FormRow },
    data () {
        return {
            form: {
                title: '',
                message: '',
                url: '',
                roles: [],
                externalUrl: true
            },
            errors: {

            }
        }
    },
    computed: {
        roleIds () {
            return Object.values(RoleNames).filter(r => r !== 'none')
        },
        canSubmit () {
            return this.form.title.length > 0 &&
                this.form.message.length > 0 &&
                this.form.roles.length > 0
        },
        urlPlaceholder () {
            return this.form.externalUrl ? 'https://flowfuse.com' : '{ name: "<component-name>", params: {id: "<id>"} }'
        }
    },
    methods: {
        getAnnouncements () {
            return adminApi.getAnnouncementNotifications()
                .then(res => console.info(res))
        },
        submitForm () {
            return this.sendAnnouncementNotification({ mock: true })
                .then(mockRes => Dialog.show({
                    header: 'Platform Wide Announcement',
                    kind: 'danger',
                    text: `You are about to send an announcement to ${mockRes.recipientCount} recipients.`,
                    confirmLabel: 'Continue'
                }, async () => this.sendAnnouncementNotification({ mock: false })))
        },
        sendAnnouncementNotification ({ mock = true }) {
            const form = { ...this.form }
            delete form.url

            const payload = {
                mock,
                ...form,
                recipientRoles: this.form.roles.map(r => Roles[r]),
                ...(this.form.externalUrl ? { url: this.form.url } : { to: JSON.parse(this.form.url) })
            }

            return adminApi.sendAnnouncementNotification(payload)
                .then(res => {
                    if (!mock) {
                        alerts.emit(`Announcement sent to ${res.recipientCount} recipients.`, 'confirmation')
                        this.form.title = ''
                        this.form.message = ''
                        this.form.url = ''
                        this.form.roles = []
                    }
                    return res
                })
                .catch(err => {
                    alerts.emit('Something went wrong', 'warning')
                    console.warn(err)
                })
        },
        toggleRole (role) {
            if (this.form.roles.includes(role)) {
                this.form.roles = this.form.roles.filter(r => r !== role)
            } else this.form.roles.push(role)
        }

    }
}
</script>

<style scoped lang="scss">
.clear-page-gutters {
    margin: -1.75rem
}
</style>
