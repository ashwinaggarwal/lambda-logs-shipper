import zlib from 'zlib';
import elasticsearch from 'elasticsearch';
import { promisify } from 'util';
import { log } from './logger';

const { ELASTICSEARCH_URL, ELASTICSEARCH_INDEX, ELASTICSEARCH_TYPE } = process.env;

const es = new elasticsearch.Client({
  host: ELASTICSEARCH_URL,
  suggestCompression: true
});

const bulkP = promisify(es.bulk.bind(es));
const gzipP = promisify(zlib.gzip.bind(zlib));

const mapRecordsToElasticSearchBulk = records => `${records.reduce(
  (mappedRecords, record) => mappedRecords.concat([
    JSON.stringify({
      index: {
        _index: ELASTICSEARCH_INDEX,
        _type: ELASTICSEARCH_TYPE
      }
    }),
    JSON.stringify(record)
  ]), []
).join('\n')}\n`;

export const bulk = async (records) => {
  const mappedRecords = mapRecordsToElasticSearchBulk(records);
  const zippedRecords = await gzipP(mappedRecords, 'utf-8');
  log('[Elasticsearch]', 'zippedRecords', zippedRecords);

  const response = await bulkP({
    body: zippedRecords,
    headers: {
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/x-ndjson',
      'content-encoding': 'gzip',
      'content-length': Buffer.byteLength(zippedRecords)
    }
  });
  return response;
};
