<template>
    <ff-dialog ref="dialog" :header="$t('ui.grantAdministratorPrivileges')" kind="danger" :confirm-label="$t('ui.grantAdminAccess')" @confirm="confirm()" @cancel="cancel()">
        <template #default>
            <div class="space-y-4">
                <p class="text-sm text-gray-700">
                    {{ $t('ui.administratorPrivilegesGrant') }} <span class="font-bold">{{ $t('ui.fullAccessToThePlatform') }}</span>{{ $t('ui.including') }}
                </p>
                <ul class="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
                    <li>{{ $t('ui.managingAllUsersAndTeams') }}</li>
                    <li>{{ $t('ui.accessingSystemSettingsAndConfiguration') }}</li>
                    <li>{{ $t('ui.viewingAndModifyingAllProjectsAndInstances') }}</li>
                    <li>{{ $t('ui.managingPlatformLicensesAndBilling') }}</li>
                </ul>
                <p class="text-sm text-red-700 font-semibold mt-4">
                    {{ $t('ui.thisIsASensitivePermissionOnlyGrantToTrustedUser') }}
                </p>
            </div>
        </template>
    </ff-dialog>
</template>

<script>

export default {
    name: 'ConfirmAdminGrantDialog',
    emits: ['confirmed', 'cancel'],
    setup () {
        return {
            show () {
                this.$refs.dialog.show()
            }
        }
    },
    methods: {
        confirm () {
            this.$emit('confirmed')
            this.$refs.dialog.close()
        },
        cancel () {
            this.$emit('cancel')
            this.$refs.dialog.close()
        }
    }
}
</script>
