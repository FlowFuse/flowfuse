import Blueprints from './Blueprints.vue'
import TeamLibrary from './TeamLibrary.vue'

export default [
    { name: 'LibraryTeamLibrary', path: 'team-library/:entryPath*', component: TeamLibrary },
    { name: 'LibraryBlueprints', path: 'blueprints', component: Blueprints },
]
