#! /usr/bin/env node
import 'dotenv/config'
import chalk from "chalk";
import { authenticateWithUsernamePassword,authenticateWithClientCredentials,authenticateWithJWT } from "./lib/auth.js";
import { program } from "commander";
import figlet from "figlet";
import PubSubApiClient from "salesforce-pubsub-api-client";
import { getAccessToken, getInstanceUrl, listAliases,removeAlias,getUserId,findAlias } from "./lib/util.js";

console.log(chalk.cyan(figlet.textSync("SfPe CLI")));
process.env.PUB_SUB_ENDPOINT = "api.pubsub.salesforce.com:7443";
process.env.SALESFORCE_AUTH_TYPE = "user-supplied";

program
  .version("1.0.0")
  .description("This is Salesforce Platform Event helper CLI.")

program
  .command("list")
  .description("List all historical salesforce connection aliases.")
  .action(async (options) => {
    listAliases();
  });

program
  .command("rm")
  .description("Remove a authenticated connection by it's alias name")
  .requiredOption(
    "-a, --alias <alias>",
    "Alias of conneciton to be removed."
  )
  .action(async (options) => {
    removeAlias(options.alias);
  });

program
  .command("aup")
  .description("Authenticate using username, password, and security token")
  .requiredOption(
    "-a, --alias <alias>",
    "Any unique identifier of Salesforce org"
  )
  .requiredOption("-u, --username <username>", "Salesforce username")
  .requiredOption("-p, --password <password>", "Salesforce password")
  .requiredOption("-t, --token <token>", "Salesforce security token")
  .requiredOption("-c, --clientId <clientId>", "Salesforce client ID")
  .requiredOption(
    "-s, --clientSecret <clientSecret>",
    "Salesforce client secret"
  )
  .option(
    "-l, --loginUrl <loginUrl>",
    "Salesforce login URL",
    "https://login.salesforce.com"
  )
  .action(async (options) => {
    try {
      await authenticateWithUsernamePassword(options);
      console.log(`Alias ${options.alias} successfully registered.`);
    } catch (error) {
      console.error("error in authentication: ", error);
    }
  });


program
  .command("acc")
  .description("Authenticate using client credentials flow")
  .requiredOption(
    "-a, --alias <alias>",
    "Any unique identifier of Salesforce org"
  )
  .requiredOption("-c, --clientId <clientId>", "Salesforce client ID")
  .requiredOption(
    "-s, --clientSecret <clientSecret>",
    "Salesforce client secret"
  )
  .option(
    "-l, --loginUrl <loginUrl>",
    "Salesforce login URL",
    "https://login.salesforce.com"
  )
  .action(async (options) => {
    try {
      //console.log("Authentication parameters: ", options);
      await authenticateWithClientCredentials(options);
      console.log(`Alias ${options.alias} successfully registered.`);
    } catch (error) {
      console.error("error in authentication: ", error);
    }
  });

program
  .command("awt")
  .description("Authenticate using jwt credentials flow")
  .requiredOption(
    "-a, --alias <alias>",
    "Any unique identifier of Salesforce org"
  )
  .requiredOption("-c, --clientId <clientId>", "Salesforce client ID")
  .requiredOption("-u, --username <username>", "Salesforce username")
  .requiredOption("-f, --keyfilepath <keFilePath>", "Salesforce username")
  .option(
    "-l, --loginUrl <loginUrl>",
    "Salesforce login URL",
    "https://login.salesforce.com"
  )
  .action(async (options) => {
    try {
      //console.log("Authentication parameters: ", options);
      await authenticateWithJWT(options);
    } catch (error) {
      console.error("error in authentication: ", error);
    }
  });

program
  .command("evtsub")
  .description("Subscribe to a platform event and listen for events in real-time.")
  .requiredOption(
    "-a, --alias <alias>",
    "Provide alias name of authenticated org"
  )
  .requiredOption(
    "-t, --topic <topic_name>",
    "Salesforce platform event/change data capture topic"
  )
  .option("-r, --replayid <replayId>", "Replay id to be used in subscription")
  .option("-n, --numevents <numEvents>", "How many events you want to recieve after subscription")
  .action(async (options) => {
    try {
      const client = new PubSubApiClient();
      await client.connectWithAuth(
        getAccessToken(options.alias),
        getInstanceUrl(options.alias)
      );
      // Subscribe to account change events
      //console.log('options-- ', options);
      let eventEmitter
      if(options.numevents && !options.replayid){
        eventEmitter = await client.subscribe("/" + options.topic, parseInt(options.numevents));
      }
      else if(!options.numevents && !options.replayid){
        eventEmitter = await client.subscribe("/" + options.topic);
      }
      else if(options.numevents && options.replayid){
        eventEmitter = await client.subscribeFromReplayId("/" + options.topic, parseInt(options.numevents), parseInt(options.replayid));
      }
      else if(!options.numevents && options.replayid){
        eventEmitter = await client.subscribeFromReplayId("/" + options.topic, null, parseInt(options.replayid));
      }
      else{
        console.error('Error: No valid combination for subscription call is found');
      }
      // Handle incoming events
      eventEmitter.on("data", (event) => {
        try {
          
          // Safely log event as a JSON string
          console.log('Received Event details:',
            JSON.stringify(
              event,
              (key, value) =>
                typeof value === "bigint" ? value.toString() : value,
              2
            )
          );
        } catch (error) {
          console.error(error);
        }
      });
    } catch (error) {
      console.error(error.message);
    }
  });


program
  .command("evtpub")
  .description("Fire or publish a platform event to listeners.")
  .requiredOption(
    "-a, --alias <alias>",
    "Provide alias name of authenticated org"
  )
  .requiredOption(
    "-t, --topic <topic_name>",
    "Platform event name (topic)"
  )
  .option("-m, --message <message>", "Message (text string) to pass along with the event as payload")
  .action(async (options) => {
    try{
      await findAlias(options.alias)
      const userId = await getUserId(options.alias);
      const client = new PubSubApiClient();
      await client.connectWithAuth(
          getAccessToken(options.alias),
          getInstanceUrl(options.alias)
      );
      const payload = {
          CreatedDate: new Date().getTime(), // Non-null value required but there's no validity check performed on this field
          CreatedById: userId, // Valid user ID
          Payload__c: { string: options.message } // Field is nullable so we need to specify the 'string' type
      };
      const publishResult = await client.publish('/' + options.topic, payload);
      console.log('Published event: ', JSON.stringify(publishResult));
    }
    catch (error) {
      console.error(error.message);
    }
  })
program.parse(process.argv);