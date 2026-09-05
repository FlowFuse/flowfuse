import { t } from '../../../i18n.js'

import BrokerChoose from './ChooseBroker.vue'
import BrokersClients from './Clients/index.vue'
import BrokerDocs from './Docs/index.vue'
import FirstClient from './FirstClient.vue'
import BrokersHierarchy from './Hierarchy/index.vue'
import BrokerNew from './NewBroker.vue'
import BrokerSettings from './Settings/index.vue'
import Brokers from './index.vue'

export default [{
    name: 'team-brokers',
    path: 'brokers',
    component: Brokers,
    meta: {
        title: t('ui.teamMqttBroker')
    },
    children: [
        {
            path: ':brokerId',
            children: [
                {
                    name: 'team-brokers-hierarchy',
                    path: 'hierarchy',
                    component: BrokersHierarchy,
                    meta: {
                        title: t('ui.teamMqttBrokerTopicHierarchy')
                    }
                },
                {
                    name: 'team-brokers-clients',
                    path: 'clients',
                    component: BrokersClients,
                    meta: {
                        title: t('ui.teamMqttBrokerClients')
                    }
                },
                {
                    name: 'team-brokers-settings',
                    path: 'settings',
                    component: BrokerSettings,
                    meta: {
                        title: t('ui.teamNewMqttBroker')
                    }
                }
            ]
        },
        {
            name: 'team-brokers-add',
            path: 'add',
            component: BrokerChoose,
            meta: {
                title: t('ui.teamAddMqttBrokers')
            }
        },
        {
            name: 'team-brokers-new',
            path: 'new',
            component: BrokerNew,
            meta: {
                title: t('ui.teamNewMqttBroker')
            }
        },
        {
            name: 'team-brokers-first-client',
            path: 'first-client',
            component: FirstClient,
            meta: {
                title: t('ui.teamNewMqttClient')
            }
        }
    ]
}, {
    name: 'team-broker-docs',
    path: 'brokers/:brokerId/docs',
    component: BrokerDocs,
    meta: {
        title: t('ui.topicHierarchyDocumentation'),
        layout: 'docs'
    }
}]
