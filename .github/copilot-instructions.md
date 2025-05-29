This repository "flowfuse" is a full stack project.

Its backend code is in the `forge` folder and the frontend in the `frontend` folder, written entirely in JavaScript.

It uses Sequelize as the ORM, Fastify as the web framework, and PostgreSQL or SQLite as the database.

Frontend is built with Vue 3 and uses Vuex for state management, Vue Router for routing and Tailwind CSS for styling.

We adhere to the eslint `standard` style guide. In particular, we use 4 spaces for indentation, we do not use semicolons, single quotes for strings, files should have a blank newline at the end, no trailing spaces on a line, no comma dangle, inline comments should have 1 space before and after the `//`.

DB migrations are handled by adding a dated JS file to the dir `/forge/db/migrations`. We don't use `down` migrations but we do keep its signature (body is empty).