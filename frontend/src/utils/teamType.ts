interface ContactRequiredParams {
    billingEnabled: boolean
    isAdmin: boolean
    selectedTeamType: { properties?: { billing?: { requireContact?: boolean } } } | null | undefined
    selectedTeamTypeId: string
    currentTeamTypeId: string
    trialMode: boolean
}

export function contactRequiredToChangeTeamType ({
    billingEnabled,
    isAdmin,
    selectedTeamType,
    selectedTeamTypeId,
    currentTeamTypeId,
    trialMode
}: ContactRequiredParams): boolean {
    if (!billingEnabled || isAdmin || !selectedTeamType?.properties?.billing?.requireContact) {
        return false
    }
    return selectedTeamTypeId !== currentTeamTypeId || trialMode
}
