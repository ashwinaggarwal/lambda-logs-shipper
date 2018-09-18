import { config } from 'dotenv';
import zlib from 'zlib';
import { promisify } from 'util';
import { flatmap } from '../../common/utils';
import { lambda } from '../../common/utils/lambda';
import { bulk } from '../../common/utils/elasticsearch';
import { log as logger, logError as loggerError } from '../../common/utils/logger';

const log = logger.bind('[kinesisTest]');
const logError = loggerError.bind('[kinesisTest]');

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

    log('unzippedData', unzippedData);

    const { logGroup, logStream, logEvents = [] } = JSON.parse(unzippedData.toString());

    return logEvents
      .filter(logEvent => !(
        logEvent.message.startsWith('START RequestId')
        || logEvent.message.startsWith('REPORT RequestId')
        || logEvent.message.startsWith('END RequestId')
      ))
      .map(logEvent => ({
        id: logEvent.id,
        message: parseMessage(logEvent.message),
        loggroup: logGroup,
        logstream: logStream,
        timestamp: new Date(logEvent.timestamp)
      }));
  }));

  return flatmap(parsedRecords);
};

export const handler = lambda(async (event, context, callback) => {
  const { Records: records = [] } = event;
  const parsedRecords = await parseRecords(records);
  const parsedRecordsLength = parsedRecords.length;

  if (parsedRecordsLength) {
    try {
      log(`bulk updating ${parsedRecordsLength} records`);
      await bulk(parsedRecords);
      callback(null, {
        statusCode: 200,
        body: `${parsedRecordsLength} records parsed`
      });
      return;
    } catch (ex) {
      logError(ex.message, ex.stack);
      callback(ex);
      return;
    }
  }

  log('no records to update');
  callback(null, {
    statusCode: 200,
    body: '0 records parsed'
  });
});
