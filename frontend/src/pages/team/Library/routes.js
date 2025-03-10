import Blueprints from './Blueprints.vue'
import Registry from './Registry/Index.vue'
import TeamLibrary from './TeamLibrary.vue'

export default [
    { name: 'LibraryBlueprints', path: 'blueprints', component: Blueprints },
    { name: 'LibraryRegistry', path: 'team-library/registry', component: Registry },
    { name: 'LibraryTeamLibrary', path: 'team-library/:entryPath*', component: TeamLibrary }
]
