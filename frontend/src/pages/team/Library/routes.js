import Blueprints from './Blueprints.vue'
import TeamLibrary from './TeamLibrary.vue'

export default [
    { name: 'LibraryBlueprints', path: 'blueprints', component: Blueprints },
    { name: 'LibraryTeamLibrary', path: 'team-library/:entryPath*', component: TeamLibrary }
]
