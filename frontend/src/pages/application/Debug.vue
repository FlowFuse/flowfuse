<template>
    <p class="mb-4 italic text-red-800">{{ $t('ui.thisIsATemporaryViewThatDisplaysTheRawApplicatio') }}</p>
    <pre class="overflow-x-scroll">{{ application }}</pre>
</template>

<script>

export default {
    name: 'ApplicationDebug',
    props: ['application']
}
</script>
