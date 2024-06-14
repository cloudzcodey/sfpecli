# sfpecli
This is sfpe CLI application for working with Salesforce platform events from the command line.

CLI supports subcribing to platform and change data capture events. You can also publish platform events from CLI and listen for event in Salesforce or any other system which have subcribed to that platform event.

You can subscribe to platform events with replayId to recieve all the platform events published after the replayId.

You can also mention the number of events to receive in the subscription call.

See command line help with -h or --help parameters of the cli.

To install dependencies:

```bash
npm install
```

For CLI help:

```bash
node app.js -h
```

## alias
Except **list** all other commands require alias to be provided as input. Alias 

## Authenticated connection details
CLI stores the authenticated connection into OS specific temporary storage. Access token is stored as an encrypted string, you can override the encryption key with appropriate value of SFPE_ENCRYPTION_KEY environment variable. 

## Different ways to authenticate in CLI
You will need to create connected app to enable user to authorize in Salesforce.
### Using username and password oauth flow
You can use **aup** subcommand to authorize in Salesforce using username and password by providing the required inputs into CLI. This flow is not recommended to be used in production orgs.
### Using client credential flow
You can use **acc** subcommand to authorize in Salesforce using client credentials flow. This flow only require client_id and client_secret.
### Using jwt flow
You can use **awt** subcommand to authorize in Salesforce using jwt flow.This flow requires RS256 based private and public keys pair.

