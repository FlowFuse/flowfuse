module.exports = {
    project: function(db, project) {
        const result = project.toJSON();
        return {
            id: result.id,
            name: result.name,
            type: result.type,
            url: result.url,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            links: result.links,
            team: {
                id: result.Team.hashid,
                name: result.Team.name,
                slug: result.Team.slug,
                links: result.Team.links
            }
        };
    },
    teamProjectList: function(db, projectList) {
        return projectList.map((t) => {
            return db.views.Project.project(t);
        });
    },
    userProjectList: function(db, projectList) {
        return projectList.map((t) => {
            return {
                id: t.id,
                name: t.name,
                type: t.type,
                url: t.url,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                links: t.links,
                team: db.views.Team.team(t.Team)
            }
        });
    }
}
