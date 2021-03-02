import Twitter from 'twitter-lite';
import { getConfigValue } from '../config';

const consumerKey = getConfigValue('TWITTER_CONSUMER_KEY');
const consumerSecret = getConfigValue('TWITTER_CONSUMER_SECRET');

if (!consumerKey) {
  throw new Error('TWITTER_CONSUMER_KEY is missing in the config');
}

if (!consumerSecret) {
  throw new Error('TWITTER_CONSUMER_SECRET is missing in the config');
}

export const twitterClient = new Twitter({
  access_token_key: getConfigValue('TWITTER_ACCESS_TOKEN_KEY'),
  access_token_secret: getConfigValue('TWITTER_ACCESS_TOKEN_SECRET'),
  consumer_key: consumerKey,
  consumer_secret: consumerSecret,
});
