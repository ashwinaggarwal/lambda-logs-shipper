import { config } from 'dotenv';
import { lambda } from '../../common/utils/lambda';
import { log as logger } from '../../common/utils/logger';
import { putSubscriptionFilter } from '../../common/utils/aws';

/* Will read env variables as set in config file, should be first thing in the app to be executed */
config();

const log = logger.bind('[subscriber]');

/* https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudWatchLogs.html#putSubscriptionFilter-property */
const getSubscriptionDataFor = logGroupName => ({
  logGroupName,
  destinationArn: process.env.KINESIS_ARN,
  filterName: 'logs-shipper',
  filterPattern: '[...]',
  roleArn: process.env.KINESIS_ROLE_ARN
});

const subscribe = async (logGroupName) => {
  log(`subscribing: ${logGroupName}`);
  await putSubscriptionFilter(getSubscriptionDataFor(logGroupName));
};

const isSubscriberOrShipper = (logGroupName) => {
  return [
    '/aws/lambda/lambda-logs-shipper-dev-subscriberHANDLER',
    '/aws/lambda/lambda-logs-shipper-dev-shipperHANDLER'
  ].indexOf(logGroupName) !== -1;
};

export const handler = lambda(async (event, context, callback) => {
  const { detail: { requestParameters: { logGroupName = '' } = {} } = {} } = event;
  const { env: { SUBSCRIPTION_FILTER } = {} } = process;

  try {
    log(`logGroupName: ${logGroupName}`);
    if (SUBSCRIPTION_FILTER
      && logGroupName.startsWith(SUBSCRIPTION_FILTER)
      && !isSubscriberOrShipper(logGroupName) /* Do not subscribe to subscriber or shipper logs */
    ) {
      await subscribe(logGroupName);

      callback(null, {
        statusCode: 200,
        body: 'Subscriptions added'
      });
    } else {
      log(`did not subscribe: ${logGroupName}`);
      callback(null, {
        statusCode: 200,
        body: 'No subscriptions to add'
      });
    }
  } catch (ex) {
    callback(ex);
  }
});
