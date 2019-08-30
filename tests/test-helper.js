import resolver from './helpers/resolver';
import { setResolver } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import './helpers/watch-property';

setResolver(resolver);
start({
  setupTestIsolationValidation: true,
});
