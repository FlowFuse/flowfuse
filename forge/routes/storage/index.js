/**
 * Node-RED Storage Backend
 *
 * - /storage
 *
 * @namespace storage
 * @memberof forge.storage
 */
module.exports = async function(app) {

  app.post('/:id/flows', async (request, response) => {
    let id = request.params.id;
    // Check if the project exists first
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let flow = await app.db.models.StorageFlow.byProject(id);
      if (flow) {
        flow.flow = JSON.stringify(request.body);
        await flow.save();
      } else {
        flow = await app.db.models.StorageFlow.create({
          flow: JSON.stringify(request.body),
          ProjectId: id
        })

        await flow.save();
      }
      response.send(request.body);
    } else {
      response.sendStatus(404);
    }
  });

  app.get('/:id/flows', async (request, response) => {
    let id = request.params.id;
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let flow = await app.db.models.StorageFlow.byProject(id);
      if (flow) {
        response.send(flow.flow)
      } else {
        response.send([])
      }
    } else {
      response.sendStatus(404)
    }
  });

  app.post('/:id/credentials', async (request, response) => {
    let id = request.params.id;
    // Check if the project exists first
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let creds = await app.db.models.StorageCredentials.byProject(id);
      if (creds) {
        creds.credentials = JSON.stringify(request.body);
        await creds.save();
      } else {
        creds = await app.db.models.StorageCredentials.create({
          credentials: JSON.stringify(request.body),
          ProjectId: id
        })
        await creds.save();
      }
      response.send(request.body);
    } else {
      response.sendStatus(404);
    }
  });

  app.get('/:id/credentials', async (request, response) => {
    let id = request.params.id;
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let creds = await app.db.models.StorageCredentials.byProject(id);
      if (creds) {
        response.send(creds)
      } else {
        response.send({})
      }
    }
  });

  app.post('/:id/settings', async (request, response) => {
    let id = request.params.id;
    // Check if the project exists first
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let settings = await app.db.models.StorageSettings.byProject(id);
      if (settings) {
        settings.settings = JSON.stringify(request.body);
        await settings.save();
      } else {
        settings = await app.db.models.StorageSettings.create({
          settings: JSON.stringify(request.body),
          ProjectId: id
        })
        await settings.save();
      }
      response.send(request.body);
    } else {
      response.sendStatus(404);
    }
  });

  app.get('/:id/settings', async (request, response) => {
    let id = request.params.id;
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let settings = await app.db.models.StorageSettings.byProject(id);
      if (settings) {
        response.send(settings.settings)
      } else {
        response.send({})
      }
    }
  });

  app.post('/:id/sessions', async (request, response) => {
    let id = request.params.id;
    // Check if the project exists first
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let sessions = await app.db.models.StorageSession.byProject(id);
      if (sessions) {
        sessions.sessions = JSON.stringify(request.body);
        await sessions.save();
      } else {
        sessions = await app.db.models.StorageSession.create({
          sessions: JSON.stringify(request.body),
          ProjectId: id
        })
        await sessions.save();
      }
      response.send(request.body);
    } else {
      response.sendStatus(404);
    }
  });

  app.get('/:id/sessions', async (request, response) => {
    let id = request.params.id;
    let project = await app.db.models.Project.byId(id);
    if (project) {
      let sessions = await app.db.models.StorageSession.byProject(id);
      if (sessions) {
        response.send(sessions)
      }
    } else {
      response.sendStatus(404)
    }
  });

  app.post('/:id/library/:type', async (request, response) => {
    let id = request.params.id;
  });

  app.get('/:id/library/:id/:type', async (request, response) => {
    let id = request.params.id;
  });

}