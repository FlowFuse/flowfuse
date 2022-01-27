module.exports = {
    // This is common code shared by:
    //   PUT /api/v1/user/ (user.js)
    //   PUT /api/v1/users/:id (users.js)
    // Access control is handled by those individual routes. For a request to reach
    // this function, the request has passed all auth checks.
    updateUser: async (app, user, request, reply) => {
        try {
            if (request.body.name && user.name !== request.body.name) {
                user.name = request.body.name
            } else if (request.body.name === '') {
                user.name = request.body.username || user.username
            }
            if (request.body.email) {
                user.email = request.body.email
            }
            if (request.body.username) {
                user.username = request.body.username
            }
            if (request.session.User.admin) {
                // Settings only an admin can modify

                if (request.body.admin !== undefined) {
                    user.admin = request.body.admin
                }

                if (request.body.password_expired === true) {
                    user.password_expired = true
                }
            }
            await user.save()
            reply.send(app.db.views.User.userProfile(user))
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            console.log(err.toString())
            console.log(responseMessage)
            reply.code(400).send({ error: responseMessage })
        }
    }
}
