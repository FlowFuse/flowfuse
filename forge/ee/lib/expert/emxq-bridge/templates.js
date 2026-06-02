// EMQX resource templates for the FF App Instance Broker → Expert Broker bridge.
// The Expert Broker uses mountpoint-based tenant namespacing (`${client_attrs.team}`),
// so these templates operate in raw `ff/v1/...` topic space — no manual prefixing.

const connector = {
    name: 'ff-expert-broker',
    type: 'mqtt',
    bridge_mode: true,
    clean_start: true,
    description: 'FlowFuse Expert bridge',
    enable: true,
    pool_size: 1,
    proto_ver: 'v5' // must be v5 to support correlation data and user properties (used in request/response patterns)
}

// Used by ruleOut to publish outbound bridge messages to the Expert Broker.
const actionOut = {
    name: 'ff-app-to-expert-action',
    type: 'mqtt',
    connector: 'ff-expert-broker',
    description: 'Publish outbound bridge messages to the Expert Broker',
    enable: true,
    parameters: {
        payload: '${payload}', // eslint-disable-line no-template-curly-in-string
        qos: 2,
        retain: false,
        topic: '${topic}' // eslint-disable-line no-template-curly-in-string
    },
    resource_opts: {
        health_check_interval: '15s',
        inflight_window: 100,
        max_buffer_bytes: '256MB',
        query_mode: 'async',
        request_ttl: '45s',
        worker_pool_size: 16
    }
}

// Expert Broker → FF App Instance Broker. The Expert Broker strips the licence-id
// mountpoint before delivery, so this subscription is in raw topic space.
const sourceChat = {
    name: 'ff-expert-to-app-chat-source',
    type: 'mqtt',
    connector: 'ff-expert-broker',
    description: 'Subscribe to chat responses on the Expert Broker',
    enable: true,
    parameters: {
        qos: 1,
        topic: 'ff/v1/expert/+/+/+/+/support/chat/response'
    },
    resource_opts: {
        health_check_interval: '15s'
    }
}

// Expert Broker → FF App Instance Broker. Inflight requests initiated by the AI agent.
const sourceInflight = {
    name: 'ff-expert-to-app-inflight-source',
    type: 'mqtt',
    connector: 'ff-expert-broker',
    description: 'Subscribe to inflight requests on the Expert Broker',
    enable: true,
    parameters: {
        qos: 1,
        topic: 'ff/v1/expert/+/+/+/+/support/inflight/+/request'
    },
    resource_opts: {
        health_check_interval: '15s'
    }
}

// Republish inbound bridge messages onto the FF App Instance Broker.
// `topic` is already mountpoint-stripped by the Expert Broker, so no rewrite needed.
//
// v5 property forwarding via the inline republish action is fiddly on EMQX:
//   - `user_properties` is a template scalar, so `${pub_props.'User-Property'}` works.
//   - Values inside `mqtt_properties` are NOT evaluated as `${pub_props.'X'}` templates
//     (they come through as literal strings). The workaround is to pre-extract each
//     hyphenated v5 prop in the SELECT under a clean alias, then reference the alias
//     with a plain `${alias}` template in `mqtt_properties`.
const ruleIn = {
    id: 'ff-expert-to-app-rule',
    name: 'ff-expert-to-app-rule',
    description: 'Republish chat responses and inflight requests on the FF App Instance Broker',
    enable: true,
    sql: 'SELECT\n  *,\n  pub_props.\'Correlation-Data\' as correlation_data,\n  pub_props.\'Response-Topic\' as response_topic,\n  pub_props.\'Content-Type\' as content_type,\n  pub_props.\'Payload-Format-Indicator\' as payload_format_indicator,\n  pub_props.\'Message-Expiry-Interval\' as message_expiry_interval\nFROM\n  "$bridges/mqtt:ff-expert-to-app-chat-source",\n  "$bridges/mqtt:ff-expert-to-app-inflight-source"',
    actions: [
        {
            args: {
                retain: false,
                payload: '${payload}', // eslint-disable-line no-template-curly-in-string
                topic: '${topic}', // eslint-disable-line no-template-curly-in-string
                qos: 1,
                direct_dispatch: false,
                mqtt_properties: {
                    'Correlation-Data': '${correlation_data}', // eslint-disable-line no-template-curly-in-string
                    'Response-Topic': '${response_topic}', // eslint-disable-line no-template-curly-in-string
                    'Content-Type': '${content_type}', // eslint-disable-line no-template-curly-in-string
                    'Payload-Format-Indicator': '${payload_format_indicator}', // eslint-disable-line no-template-curly-in-string
                    'Message-Expiry-Interval': '${message_expiry_interval}' // eslint-disable-line no-template-curly-in-string
                },
                user_properties: "${pub_props.'User-Property'}" // eslint-disable-line no-template-curly-in-string
            },
            function: 'republish'
        }
    ]
}

// FF App Instance Broker → Expert Broker. Forwards two patterns:
//   - ../support/chat/request
//   - ../support/inflight/+/response
// The Expert Broker's mountpoint applies the `<licenceId>/` namespace prefix on receipt.
const ruleOut = {
    id: 'ff-app-to-expert-rule',
    name: 'ff-app-to-expert-rule',
    description: 'Forward chat requests and inflight responses to the Expert Broker',
    enable: true,
    sql: 'SELECT\n  *\nFROM\n  "ff/v1/expert/+/+/+/+/support/chat/request",\n  "ff/v1/expert/+/+/+/+/support/inflight/+/response"',
    actions: [
        'mqtt:ff-app-to-expert-action'
    ]
}

module.exports = { connector, actionOut, sourceChat, sourceInflight, ruleIn, ruleOut }
