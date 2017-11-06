import Ember from 'ember';
import resolver from './helpers/resolver';
import { setResolver } from 'ember-qunit';
import { start } from 'ember-cli-qunit';
import './helpers/watch-property';
import overrideThrows from './helpers/qunit-throws-override';

overrideThrows();
setResolver(resolver);
start();

Ember.Test.adapter.exception = reason => {
  throw reason;
};
