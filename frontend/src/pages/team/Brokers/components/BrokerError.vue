<template>
    <div class="w-full bg-red-50 text-red-500 p-4 rounded-lg block border border-red-300 mb-4">
        Error ({{ errorCode }}): {{ errorMessage }}
    </div>
</template>

<script>
export default {
    name: 'BrokerError',
    props: {
        errorCode: {
            type: String,
            required: true
        }
    },
    computed: {
        errorMessage () {
            switch (this.errorCode) {
            case 'ENOTFOUND':
                return 'The broker could not be found. Please check your connection settings and try again.'
            default:
                return ''
            }
        }
    }
}
</script>
