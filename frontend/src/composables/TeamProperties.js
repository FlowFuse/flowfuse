function getProperty (properties, key) {
    let teamValue
    if (properties) {
        const parts = key.split('.')
        let props = properties
        while (parts.length > 0) {
            const k = parts.shift()
            if (Object.hasOwn(props, k)) {
                if (parts.length > 0) {
                    props = props[k]
                } else {
                    teamValue = props[k]
                    break
                }
            } else {
                break
            }
        }
    }
    return teamValue
}

export function getTeamProperty (team, property, defaultValue) {
    const teamValue = getProperty(team.properties, property)
    if (teamValue === undefined) {
        // console.log('getTeamProperty - TYPE', property, getProperty(team.type.properties, property) ?? defaultValue)
        // No value found in team properties. Check the TeamType properties
        return getProperty(team.type.properties, property) ?? defaultValue
    }
    // console.log('getTeamProperty - TEAM', property, teamValue)
    return teamValue
}
