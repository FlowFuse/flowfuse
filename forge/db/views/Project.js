module.exports = {
    project: function(db, project) {
        const proj = project.toJSON();
        const result = {
            id: proj.id,
            name: proj.name,
            type: proj.type,
            url: proj.url,
            createdAt: proj.createdAt,
            updatedAt: proj.updatedAt,
            links: proj.links,
        }
        if (proj.Team) {
            result.team = {
                id: proj.Team.hashid,
                name: proj.Team.name,
                slug: proj.Team.slug,
                links: proj.Team.links
            }
        }
        return result;
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
