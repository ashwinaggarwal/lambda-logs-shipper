import { config } from 'dotenv';
import { lambda } from '../../common/utils/lambda';
import { log } from '../../common/utils/logger';

/* Will read env variables as set in config file, should be first thing in the app to be executed */
config();

export const get = lambda((event, context, callback) => {
  log('[Test:GET]', 'event', JSON.stringify(event));
  callback(null, {
    statusCode: 200,
    body: 'Welcome to White House'
  });
});
