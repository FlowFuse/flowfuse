import BrokerChoose from './ChooseBroker.vue'
import BrokersClients from './Clients/index.vue'
import BrokerSettings from './External/BrokerSettings.vue'
import BrokerNew from './External/NewBroker.vue'
import FirstClient from './FirstClient.vue'
import BrokersHierarchy from './Hierarchy/index.vue'
import Brokers from './index.vue'

export default {
    name: 'team-brokers',
    path: 'brokers',
    component: Brokers,
    meta: {
        title: 'Team - MQTT Broker'
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
                        title: 'Team - MQTT Broker Topic Hierarchy'
                    }
                },
                {
                    name: 'team-brokers-clients',
                    path: 'clients',
                    component: BrokersClients,
                    meta: {
                        title: 'Team - MQTT Broker Clients'
                    }
                },
                {
                    name: 'team-brokers-settings',
                    path: 'settings',
                    component: BrokerSettings,
                    meta: {
                        title: 'Team - New MQTT Broker'
                    }
                }
            ]
        },
        {
            name: 'team-brokers-add',
            path: 'add',
            component: BrokerChoose,
            meta: {
                title: 'Team - Add MQTT Brokers'
            }
        },
        {
            name: 'team-brokers-new',
            path: 'new',
            component: BrokerNew,
            meta: {
                title: 'Team - New MQTT Broker'
            }
        },
        {
            name: 'team-brokers-first-client',
            path: 'first-client',
            component: FirstClient,
            meta: {
                title: 'Team - New MQTT Client'
            }
        }
    ]
}
