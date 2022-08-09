# Database Migrations

It is important that any changes made to the database models include migrations
that can modify the database state from one state to another.

Whilst we use Sequelize as our ORM layer, we do not use the migration tooling
it provides - we have our own.

## Creating migrations

### Filename

A migration is provided as a JavaScript in the directory `forge/db/migrations`.
Its file name must follow the pattern:

```
YYYYMMDD-nn-description.js
```

 - `YYYYMMDD` - the date the migration is added
 - `nn` - a two digit number
 - `description` - a name for the migration

For example `20220204-01-add-billing.js`.

This ensures the migrations have a natural order to be applied. The `nn` part of
the name allows multiple migrations to be added on the same day, but kept in the
right order.

### Structure

The migration code should use the following layout:

```
module.exports = {
    up: async (context) => {
        // Apply the migration
    },
    down: async (context) => {
        // Remove the migration
    }
}
```

The `up` function applies the migration. This can be to create new tables, add columns
to existing ones - whatever is needed.

The `down` function reverses the migration. It should restore the database back to
how it was prior to the migration.

The `context` argument is an instance of [Sequelize.QueryInterface](https://sequelize.org/v6/class/lib/dialects/abstract/query-interface.js~QueryInterface.html) that can be used to perform
operations on the database.

## Applying migrations

Migrations are applied automatically on start of the FlowForge application. Down
migrations are not yet supported.
