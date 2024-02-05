import { setUser } from '@sentry/vue'

/**
 *
 * @param {String} userId - the unique identifier for the user
 * @param {Object} set - an object containing any number of properties to bind with this user, these can be overridden
 * @param {Object} setonce - an object containing any number of properties to bind with this user, these can never be overridden
 */
function identify (userId, set, setonce) {
    window.posthog?.identify(userId, set, setonce)
    if (window.sentryConfig) {
        setUser({
            ...set,
            ...setonce
        })
    }
    const _hsq = window._hsq = window._hsq || []
    _hsq.push(['identify', {
        id: userId,
        email: set.email
    }])
}

/**
 *
 * @param {String} event - the name/identifier of the event
 * @param {Object} properties - an object containing any number of properties to bind with this event, this can also contain
 * a proeprty $set or $set_once which in turn can be an object to bind properties to the associated user
 * @param {Object} groups - ties a given 'group' to the event. Optional keys: 'team', 'application', 'instance', 'device'
 */
function capture (event, properties, groups) {
    if (!properties) {
        properties = {}
    }
    if (groups) {
        properties.$groups = groups
    }
    window.posthog?.capture(event, properties)
}

/**
 *
 * @param {String} type - team | application | instance | device
 * @param {String} id - the associated id to this group type
 * @param {Object} proeprties - a JSON object defining features for this group, all can be overriden
 */
function groupUpdate (type, id, properties) {
    capture('$groupidentify', {
        $group_type: type,
        $group_key: id,
        $group_set: properties
    })
}

export default {
    identify,
    capture,
    groupUpdate
}
