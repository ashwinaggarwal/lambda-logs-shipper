import elasticsearch from 'elasticsearch';
import { promisify } from 'util';

const { ELASTICSEARCH_URL, ELASTICSEARCH_INDEX, ELASTICSEARCH_TYPE } = process.env;

const es = new elasticsearch.Client({
  host: ELASTICSEARCH_URL
});

const bulkP = promisify(es.bulk.bind(es));

const mapRecordsToElasticSearchBulk = records => records.reduce(
  (mappedRecords, record) => mappedRecords.concat([
    {
      index: {
        _index: ELASTICSEARCH_INDEX,
        _type: ELASTICSEARCH_TYPE
      }
    },
    record
  ]), []
);

export const bulk = records => bulkP({ body: mapRecordsToElasticSearchBulk(records) });
