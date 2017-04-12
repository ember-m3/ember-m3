import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';
import IndexPage from '../pages/index';

moduleForAcceptance('acceptance/m3');

test('payloads can be rendered as m3 models', function(assert) {
  const page = new IndexPage();

  page.visit();

  andThen(() => {
    assert.equal(currentURL(), '/', 'navigated to right page');

    assert.deepEqual(page.feedUpdates().map(x => x.id()), [
      'urn:li:fs_feedUpdate:(cz0wVW5zdXBwb3J0ZWRSZWFzb24=,urn:li:activity:6229685779623481344)',
      'urn:li:fs_feedUpdate:(cz0wVW5zdXBwb3J0ZWRSZWFzb24=,urn:li:activity:6229646510682890240)',
      'urn:li:fs_feedUpdate:(cz0wVW5zdXBwb3J0ZWRSZWFzb24=,urn:li:activity:6229651932580024320)',
      'urn:li:fs_feedUpdate:(cz0wVHJlbmRpbmdJblNpbWlsYXJDb21wYW55PXVybjpsaTpjb21wYW55OjE4MTUyMThVbnN1cHBvcnRlZFJlYXNvblVuc3VwcG9ydGVkUmVhc29u,urn:li:article:9058526097577687972)',
      'urn:li:fs_feedUpdate:(cz0wVW5zdXBwb3J0ZWRSZWFzb24=,urn:li:activity:6229685994925498368)',
      'urn:li:fs_feedUpdate:(cz0x,urn:li:activity:6224819311329054720)',
      'urn:li:fs_feedUpdate:(cz0wVW5zdXBwb3J0ZWRSZWFzb24=,urn:li:activity:6229563950770589696)',
      'urn:li:fs_feedUpdate:(cz0wVW5zdXBwb3J0ZWRSZWFzb24=,urn:li:activity:6229507659889020928)',
      'urn:li:fs_feedUpdate:(cz0wVHJlbmRpbmdJbkluZHVzdHJ5PXVybjpsaTppbmR1c3RyeTo0VW5zdXBwb3J0ZWRSZWFzb25VbnN1cHBvcnRlZFJlYXNvbg==,urn:li:article:7993460312515897007)'
    ], 'top-level collection ids rendered');

    assert.deepEqual(page.feedUpdates().map(x => x.permalink()), [
      'https://www.linkedin.com/hp/update/6229685779623481344',
      'https://www.linkedin.com/hp/update/6229646510682890240',
      'https://www.linkedin.com/hp/update/6229651932580024320',
      'http://andrewchen.co/whats-next-in-growth-and-marketing-for-tech/',
      'https://www.linkedin.com/hp/update/6229685994925498368',
      'https://www.linkedin.com/hp/update/6224819311329054720',
      'https://www.linkedin.com/hp/update/6229563950770589696',
      'https://www.linkedin.com/hp/update/6229507659889020928',
      'http://www.businessinsider.com/hilarious-twitter-memes-inspired-by-the-young-pope-2017-1'
    ], 'able to read attributes from top-level referenced collection items');

    assert.deepEqual(page.feedUpdates().map(x => x.socialDetail().id()), [
      'urn:li:fs_socialDetail:urn:li:activity:6225417880964595712',
      'urn:li:fs_socialDetail:urn:li:activity:6227852255626960896',
      'urn:li:fs_socialDetail:urn:li:activity:6229232335435468800',
      'urn:li:fs_socialDetail:urn:li:article:9058526097577687972',
      'urn:li:fs_socialDetail:urn:li:article:8916738504574065268',
      'urn:li:fs_socialDetail:urn:li:activity:6224819311329054720',
      'urn:li:fs_socialDetail:urn:li:activity:6229415351260639232',
      'urn:li:fs_socialDetail:urn:li:activity:6229507659889020928',
      'urn:li:fs_socialDetail:urn:li:article:7993460312515897007'
    ], 'able to read deeply referenced attributes ');

    assert.equal(
      page.feedUpdates()[0].comments()[0].value(),
      'Special thanks to you, Asif for your guidance and partnership!',
      'able to read nested object attribute'
    );
  });
});

test('m3 models can be updated', function(assert) {
  const page = new IndexPage();

  page.visit();

  andThen(() => {
    assert.equal(currentURL(), '/', 'navigated to right page');

    assert.equal(
      page.feedUpdates()[0].permalink(),
      'https://www.linkedin.com/hp/update/6229685779623481344'
    );
  });

  click('button.update-data');

  andThen(() => {
    assert.equal(
      page.feedUpdates()[0].permalink(),
      'update data'
    );
  });
});

