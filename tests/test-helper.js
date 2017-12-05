import Ember from 'ember';
import resolver from './helpers/resolver';
import {
  setResolver
} from 'ember-qunit';
import { start } from 'ember-cli-qunit';

Ember.Test.adapter.exception = (reason) => { throw reason; };

setResolver(resolver);
start();
