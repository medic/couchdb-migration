const rpn = require('request-promise-native');
const uuid = require('uuid').v4;
const fs = require('fs').promises;
const path = require('path');

const url = process.env.HOST_COUCH_URL;
const [,,dataPath] = process.argv;

// const nbrDatabases = 4;
const nbrDocuments = 1000;

const ddoc = {
  '_id': '_design/test',
  'views': {
    'view': {
      'map': 'function(doc) {\n  emit(doc.value); }',
    }
  }
};

const generateDatabase = async (name, docs = []) => {
  const dbName = name || `db${uuid()}`;

  console.log('generating database', dbName);
  await rpn.put({ url: `${url}/${dbName}`, json: true });

  const documents = Array
    .from({ length: nbrDocuments })
    .map(() => ({ _id: uuid(), value: uuid() }));
  documents.push(...docs);

  await fs.writeFile(path.join(dataPath, `${dbName}.json`), JSON.stringify(documents));
  await rpn.post({ url: `${url}/${dbName}/_bulk_docs`, json: true, body: { docs: [ddoc, ...documents] } });
  await rpn.get({ url: `${url}/${dbName}/_design/test/_view/view?update_seq=true`, json: true });
};

(async () => {
  const report = {
    _id: 'report',
    type: 'data_record',
    tasks: [{ state: 'pending' }],
    form: 'omg',
    contact: { _id: 'contact', parent: { _id: 'parent' } },
    fields: {
      month: 1,
      year: 2,
      week: 3,
      patient_id: 123,
      visited_contact_uuid: 123,
    },
    reported_date: 100,
    sms_message: 'thing',

  };
  const contact = {
    _id: 'contact',
    type: 'person',
    parent: { _id: 'parent', parent: { _id: 'grandparent' } },
    patient_id: '123',
    dhis: { orgUnit: 2 },
    phone: 2,
  };

  const task = {
    _id: 'task',
    type: 'task',
  };

  await generateDatabase('medic', [report, contact, task]);
  await generateDatabase('medic-sentinel');
  await generateDatabase('medic-logs', );
  await generateDatabase();
  await generateDatabase();
  await generateDatabase();
  await generateDatabase();
  await generateDatabase();
})();
