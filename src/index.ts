import { tmiClient } from './clients/tmi';
import { getLogger } from './clients/logger';
// import { PubSubConnect } from './clients/twitch-pubsub';

const logger = getLogger();

tmiClient.connect();
// PubSubConnect();

// Make sure we get a log of any exceptions that aren't checked
process.on('uncaughtException', (error) => {
  logger.error(error)
  throw error
});

process.on('SIGINT', function() {
  logger.error( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
  // some other closing procedures go here
  process.exit(1);
});