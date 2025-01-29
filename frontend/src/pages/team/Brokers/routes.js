import BrokersClients from './Clients/index.vue'
import BrokersCreate from './Create.vue'
import BrokersHierarchy from './Hierarchy/index.vue'
import Brokers from './index.vue'

export default {
    name: 'team-brokers',
    path: 'broker',
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
            name: 'team-brokers-create',
            path: 'create',
            component: BrokersCreate,
            meta: {
                title: 'Team - Create MQTT Brokers'
            }
        }
    ]
}
