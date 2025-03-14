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
            case 'ECONNREFUSED':
                return 'Your broker refused the connection, this is most likely either an incorrectly configured port or hostname.'
            case 'ENOTFOUND':
                return 'Your broker could not be found. Please check your connection settings and try again.'
            case 'WRONGMQTTVERSION':
                return 'Your broker does not support the configured MQTT protocol version. Please check your connection settings and try again.'
            case 'CLIENTIDNOTALLOWED':
                return 'Your broker has rejected the connection because the ClientID is either too long or contains invalid characters'
            case 'MALFORMEDCREDS':
                return 'Your broker has rejected the connection due to bad credentials. Please check your configured username/password.'
            case 'NOTAUTHORIZED':
                return 'Your broker has rejected the connection due to incorrect credentials'
            case 'BANNED':
                return 'Your MQTT 5 broker has banned this client connection.'
            default:
                return ''
            }
        }
    }
}
</script>
