module.exports = {
    updateUser: async (app, user, request, reply) => {
        try {
            if (request.body.name && user.name !== request.body.name) {
                user.name = request.body.name;
            } else if (request.body.name === "") {
                user.name = request.body.username || user.username;
            }
            if (request.body.email) {
                user.email = request.body.email;
            }
            if (request.body.username) {
                user.username = request.body.username;
            }
            if (request.session.User.admin) {
                // Only admin users can modify the admin flag
                if (request.body.hasOwnProperty('admin')) {
                    user.admin = request.body.admin;
                }
            }
            await user.save();
            reply.send(app.db.views.User.userProfile(user))
        } catch(err) {
            let responseMessage;
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(",");
            } else {
                responseMessage = err.toString();
            }
            console.log(err.toString())
            console.log(responseMessage)
            reply.code(400).send({error:responseMessage})
        }

    }
}
