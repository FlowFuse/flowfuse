module.exports = {
    teamProjectList: function(db, projectList) {
        return projectList.map((t) => {
            return {
                id: t.id,
                name: t.name,
                type: t.type,
                url: t.url,
                team: t.Team.name
            }
        });
    }
}
