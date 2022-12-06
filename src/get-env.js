const utils = require('./utils');
const envVarNames = require('./env-var-names');

const getEnv = async () => {
  const secret = await utils.getConfig('couch_httpd_auth', 'secret');
  const uuid = await utils.getConfig('couchdb', 'uuid');
  const user = utils.couchUrl.username;
  const password = utils.couchUrl.password;

  console.log(`${envVarNames.couchUser}=${user}`);
  console.log(`${envVarNames.couchPassword}=${password}`);
  console.log(`${envVarNames.couchSecret}=${secret}`);
  console.log(`${envVarNames.couchUuid}=${uuid}`);
};

module.exports = {
  getEnv,
};
