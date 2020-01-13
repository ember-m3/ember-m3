import Application from '../app';
import { setApplication } from '@ember/test-helpers';
import config from '../config/environment';
import { start } from 'ember-qunit';
import './helpers/watch-property';
import QUnit from 'qunit';
import 'ember-m3/initializers/m3-store';

QUnit.config.urlConfig.push({
  id: 'enableoptionalfeatures',
  label: 'Enable Opt Features',
});

setApplication(Application.create(config.APP));
start({
  setupTestIsolationValidation: true,
});
