---
navTitle: Database migrations
---

# Database Migrations

Any changes made to the database models must include migrations
that can modify the database state from one state to another.

Whilst we use Sequelize as our ORM layer, we do not use the migration tooling
it provides - we have our own.

## Creating migrations

### Filename

A migration is provided as JavaScript in the directory `forge/db/migrations`.
Its file name must follow the pattern:

```
YYYYMMDD-nn-description.js
```

 - `YYYYMMDD` - the date the migration is added
 - `nn` - a two digit number
 - `description` - a name for the migration

For example `20220204-01-add-billing.js`.

This ensures the migrations have a natural order to be applied. The `nn` part of
the name allows multiple migrations to be added on the same day but is kept in the
right order.

### Structure

The migration code should use the following layout:

```js
module.exports = {
    up: async (context) => {
        // Apply the migration
    },
    down: async (context) => {
        // Remove the migration
    }
}
```

The `up` function applies to the migration. This can be to create new tables, add columns
to existing ones - whatever is needed.

The `down` function reverses the migration. It should restore the database back to
how it was prior to the migration.

The `context` argument is an instance of [Sequelize.QueryInterface](https://sequelize.org/docs/v6/other-topics/query-interface/) that can be used to perform
operations on the database.

## Applying migrations

Migrations are applied automatically at the start of the FlowFuse application. Down
migrations are not yet supported.

## Considerations when writing migrations

Whilst migrations give us the ability to make changes to the database, they must
be used with great care. A failing migration will prevent the platform from starting
and may require manual intervention. Everything should be done to avoid that from
happening.

Certain types of migration need particular guidance and care over.

### Adding constraints

If a migration is adding a new constraint to an existing table, you need to consider
very carefully what impact that could have on an existing system with real data.

For example, adding a new 'unique' constraint where you cannot guarantee that
constraint hasn't already been broken. What strategy will you use to guard against
that or to help recover from it? What additional testing is needed for the migration
to verify its behavior in those situations?

The preferred method to add a new unique constraint is by adding a new index to the
database. This is because SQLite doesn't provide a way to alter columns that doesn't
involve dropping the whole table and triggering any cascade triggers.