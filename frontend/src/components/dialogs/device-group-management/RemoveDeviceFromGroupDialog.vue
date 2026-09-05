<template>
    <section data-el="add-device-to-group-dialog" class="add-device-to-group-dialog">
        <p>{{ $t('ui.areYouSureYouWantToContinue') }}</p>

        <notice-banner
            class="my-5"
            :text="$t('ui.theseRemoteInstancesWillBeClearedOfAnyActivePipe')"
        />

        <device-list
            :devices="devices"
            @selection-removed="$emit('selection-removed', $event)"
        />
    </section>
</template>

<script>

import NoticeBanner from '../../notices/NoticeBanner.vue'

import DeviceList from './components/device-list.vue'

export default {
    name: 'RemoveDeviceFromGroupDialog',
    components: { NoticeBanner, DeviceList },
    props: {
        devices: {
            required: true,
            type: Array
        }
    },
    emits: ['selection-removed']
}
</script>

<style scoped lang="scss">

</style>
