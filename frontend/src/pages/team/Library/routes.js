import Blueprints from './Blueprints.vue'
import TeamLibrary from './TeamLibrary.vue'

export default [
    { name: 'TeamSharedLibraryBlueprints', path: 'blueprints', component: Blueprints },
    { name: 'TeamSharedLibraryTeamLibrary', path: 'team-library/:entryPath*', component: TeamLibrary }
]
