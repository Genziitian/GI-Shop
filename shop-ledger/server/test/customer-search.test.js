const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

for (const file of ['../../src/lib/customerSearch.js', '../../../shop-ledger-mobile/src/utils/customerSearch.js']) {
  const load = () => import(`data:text/javascript;base64,${fs.readFileSync(path.join(__dirname, file)).toString('base64')}`);
  test(`${file}: name search lists both people; ID digits do not match unrelated phones`, async () => {
    const { mergeCustomerResults } = await load();
    const people = [{name:'Ramesh',phone:'9876543210',shortId:'ram123'}, {name:'Ramesh',phone:'9999999999',shortId:'ram999'}, {name:'Different',phone:'9876512321',shortId:'other55'}];
    assert.equal(mergeCustomerResults(people, [], 'Ramesh').length, 2);
    assert.equal(mergeCustomerResults(people, [], 'ram123').length, 1);
    assert.equal(mergeCustomerResults(people, [], '#RAM123')[0].shortId, 'ram123');
  });
  test(`${file}: deduplication preserves balance and requires explicit historical connection`, async () => {
    const { mergeCustomerResults } = await load();
    const saved = { name:'Shop nickname',phone:'9876543210', totalDue:160 };
    const account = {name:'Ramesh', phone:'+91 9876543210', shortId:'ram123',email:'ramesh@example.test'};
    const results = mergeCustomerResults([saved], [account], 'Ramesh');
    assert.equal(results.length, 1);
    assert.equal(results[0].totalDue, 160);
    assert.equal(results[0].name, 'Shop nickname');
    assert.equal(results[0]._appAccountName, 'Ramesh');
    assert.equal(results[0]._linkExistingPhone, '9876543210');
    assert.equal(results[0]._needsSave, true);
    const linked = mergeCustomerResults([{ ...saved,shortId:'ram123' }], [account]);
    assert.equal(linked[0]._needsSave, false);
    assert.equal(linked[0]._linkExistingPhone, undefined);
  });
  test(`${file}: distinct linked accounts sharing a phone are kept separate`, async () => {
    const { mergeCustomerResults } = await load();
    assert.equal(mergeCustomerResults([{name:'A', phone:'9876543210', shortId:'abc12'}], [{name:'B',phone:'9876543210',shortId:'def34'}]).length, 2);
  });
  test(`${file}: new-customer drafts never store a name, email or ID as a phone`, async () => {
    const { customerDraftFromQuery } = await load();
    assert.deepEqual(customerDraftFromQuery('Ramesh Kumar'), {name:'Ramesh Kumar',phone:''});
    assert.deepEqual(customerDraftFromQuery('+91 98765 43210'), {name:'',phone:'9876543210'});
    for (const query of ['ram123','ramesh@example.test']) assert.deepEqual(customerDraftFromQuery(query),{name:'',phone:''});
  });
}
