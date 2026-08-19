import Blueprints from './Blueprints.vue'
import Registry from './Registry/Index.vue'
import TeamLibrary from './TeamLibrary.vue'

export default [
    { name: 'team-library-blueprints', path: 'blueprints', component: Blueprints },
    { name: 'team-library-registry', path: 'team-library/registry', component: Registry },
    { name: 'team-library-files', path: 'team-library/:entryPath*', component: TeamLibrary }
]
