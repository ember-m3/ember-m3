import resolver from './helpers/resolver';
import { setResolver } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import './helpers/watch-property';
import QUnit from 'qunit';

QUnit.config.urlConfig.push({
  id: 'enableoptionalfeatures',
  label: 'Enable Opt Features',
});

setResolver(resolver);
start({
  setupTestIsolationValidation: true,
});
