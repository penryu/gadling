# gadling

An informal Slack bot with features similar to IRC bots.

## Provisioning

### Database

Several plugins use a PostgreSQL database for persistent data. To use these
features, a database will need to be provisioned.

Once provisioned, you can run the migrations in the `/db/` directory using
[dbmate][dbmate]. These migrations also inject some test data.

Once migrated, export the PostgreSQL connection string in the environment
variable `DATABASE_URL`.

### Slack App

As a Slack App, the app must be created and provisioned in the target workspace.
The required permissions are specified in the [manifest.yml](./manifest.yml)
file, which can also be used to initialize the Slack App.

The privileges specified in the manifest cover everything the bot currently
does. Any new actions added may require adding new permissions to your app.

Conversely, permissions may be removed from the app. This may result in errors
or crashing for any features that rely on the removed persmissions.

## Usage and Development

Plugins can be disabled by commenting out their inclusion in the
[plugins/index](./src/plugins/index.ts).

### "Out of the box" use

```bash
# First run, and after updates...
$ yarn install

# Run test suite (needs work)
$ yarn test

# Development use
$ yarn dev

# Between updates/changes...
$ yarn build
$ yarn start
```

[dbmate]: https://github.com/amacneil/dbmate
