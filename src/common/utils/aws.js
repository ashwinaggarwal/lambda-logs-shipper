import { promisify } from 'util';
import { config, CloudWatchLogs } from 'aws-sdk';

config.update({
  region: 'eu-west-1'
});

const cloudwatchlogs = new CloudWatchLogs();

export const putSubscriptionFilter = promisify(
  cloudwatchlogs.putSubscriptionFilter.bind(cloudwatchlogs)
);
