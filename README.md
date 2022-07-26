# gadling

An informal Slack bot with features similar to IRC bots.

## Provisioning

Several plugins use a SQLite3 database for persistent data. If no existing database file is found, one will be created and initialized at the default path.

As a Slack App, the app must be created and provisioned in the target workspace.
The required permissions are specified in the [manifest.yml](./manifest.yml)
file, which can also be used to initialize the Slack App.

The privileges specified in the manifest cover everything the bot currently does. Any new actions added may require adding new permissions to your app.

Conversely, permissions may be removed from the app. This may result in errors or crashing for any features that rely on the removed persmissions.

Plugins can be disabled by commenting out their inclusion in the [plugins/index](./src/plugins/index.ts).

## Usage

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
