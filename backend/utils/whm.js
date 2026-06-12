const axios = require('axios');

// InMotion WHM API client
const whmClient = axios.create({
  baseURL: process.env.WHM_HOST,
  headers: {
    Authorization: `whm ${process.env.WHM_USER}:${process.env.WHM_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000,
  httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
});

const PLAN_PACKAGES = {
  starter:  'nexahost_starter',
  business: 'nexahost_business',
  pro:      'nexahost_pro'
};

async function createHostingAccount(user, plan) {
  const username = user.email.split('@')[0].replace(/[^a-z0-9]/gi,'').slice(0,8).toLowerCase()
    + Math.floor(Math.random()*100);
  const password = Math.random().toString(36).slice(-12) + 'Aa1!';
  const domain   = user.email.split('@')[1] || `${username}.nexahost.com`;

  const response = await whmClient.get('/json-api/createacct', {
    params: {
      username, password, domain,
      plan: PLAN_PACKAGES[plan] || PLAN_PACKAGES.starter,
      contactemail: user.email,
      featurelist: 'default'
    }
  });

  if (response.data?.result?.[0]?.status !== 1)
    throw new Error(response.data?.result?.[0]?.statusmsg || 'WHM account creation failed');

  return { username, password, domain, cpanelUrl: `${process.env.WHM_HOST.replace(':2087',':2083')}` };
}

async function suspendAccount(username, reason = 'Non-payment') {
  await whmClient.get('/json-api/suspendacct', { params: { user: username, reason } });
}

async function unsuspendAccount(username) {
  await whmClient.get('/json-api/unsuspendacct', { params: { user: username } });
}

async function terminateAccount(username) {
  await whmClient.get('/json-api/removeacct', { params: { user: username } });
}

async function changePackage(username, plan) {
  await whmClient.get('/json-api/changepackage', {
    params: { user: username, pkg: PLAN_PACKAGES[plan] || PLAN_PACKAGES.starter }
  });
}

async function getAccountInfo(username) {
  const r = await whmClient.get('/json-api/accountsummary', { params: { user: username } });
  return r.data?.acct?.[0] || null;
}

module.exports = { createHostingAccount, suspendAccount, unsuspendAccount, terminateAccount, changePackage, getAccountInfo };
