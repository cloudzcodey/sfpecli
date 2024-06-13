# sfpecli
This is sfpe CLI application for subcribing and publishing platform events from the command line.

See command line help with -h or --help parameters of the cli.

To install dependencies:

```bash
npm install
```

For CLI help:

```bash
node app.js -h
```

## Authenticated connection details
CLI stores the authenticated connection into OS specific temporary storage. Access token is stored as an encrypted string, you can override the encryption key with appropriate value of SFPE_ENCRYPTION_KEY environment variable. 