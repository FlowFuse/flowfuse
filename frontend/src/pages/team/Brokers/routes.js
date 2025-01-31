import BrokerChoose from './ChooseBroker.vue'
import BrokersClients from './Clients/index.vue'
import BrokerSettings from './External/BrokerSettings.vue'
import BrokerNew from './External/NewBroker.vue'
import BrokersHierarchy from './Hierarchy/index.vue'
import Brokers from './index.vue'

export default {
    name: 'team-brokers',
    path: 'brokers/:brokerId?',
    component: Brokers,
    redirect: { name: 'team-brokers-hierarchy' },
    meta: {
        title: 'Team - MQTT Broker'
    },
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
            name: 'team-brokers-settings',
            path: 'settings',
            component: BrokerSettings,
            meta: {
                title: 'Team - New MQTT Broker'
            }
        }
    ]
}
