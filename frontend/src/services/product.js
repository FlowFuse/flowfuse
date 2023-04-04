import posthog from 'posthog-js'

function getFeatureFlags () {
    posthog.onFeatureFlags((flags, values) => {
        console.log(flags, values)
    })
}

export default {

}
