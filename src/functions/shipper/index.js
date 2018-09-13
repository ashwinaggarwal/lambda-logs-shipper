import { config } from 'dotenv';
import zlib from 'zlib';
import { promisify } from 'util';
import { flatmap } from '../../common/utils';
import { lambda } from '../../common/utils/lambda';
import { log as logger } from '../../common/utils/logger';

const log = logger.bind('[kinesisTest]');

const gunzipP = promisify(zlib.gunzip);

/* Will read env variables as set in config file, should be first thing in the app to be executed */
config();

const parseMessage = (message) => {
  try {
    return JSON.parse(message);
  } catch (ex) {
    return unescape(message).trim();
  }
};

const parseRecords = async (records) => {
  const parsedRecords = await Promise.all(records.map(async (record) => {
    const dataBuffer = Buffer.from(record.kinesis.data, 'base64');
    const unzippedData = await gunzipP(dataBuffer);

    const { logGroup, logStream, logEvents = [] } = JSON.parse(unzippedData.toString());

    return logEvents
      .filter(logEvent => !(
        logEvent.message.startsWith('START RequestId')
        || logEvent.message.startsWith('REPORT RequestId')
        || logEvent.message.startsWith('END RequestId')
      ))
      .map(logEvent => ({
        '@id': logEvent.id,
        '@message': parseMessage(logEvent.message),
        '@timestamp': logEvent.timestamp,
        '@loggroup': logGroup,
        '@logstream': logStream
      }));
  }));

  return flatmap(parsedRecords);
};

export const handler = lambda(async (event, context, callback) => {
  const { Records: records = [] } = event;

  const parsedRecords = await parseRecords(records);

  log('parsedRecords', JSON.stringify(parsedRecords));

  callback(null, {
    statusCode: 200,
    body: parsedRecords.length ? 'Parsed Records' : 'No records to parse'
  });
});
