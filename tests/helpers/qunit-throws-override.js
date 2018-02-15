/*
  The below PR caused errors thrown within calls to `Ember.run(() => {})` to be handled
  by the test adapter and turned into auto-asserts. While this caught a class of silent
  bugs, it broke tests intended to assert error conditions that use `try {} catch (e) {}`
  and `assert.throws()`.

  https://github.com/emberjs/ember.js/pull/14898

  This overrides QUnit.assert.throws to restore the previous expected behavior for now;
  however, a long term solution for enabling synchronous errors to be properly asserted
  should be investigated, especially so that we do not break expectations around `try ... catch`
  for synchronous errors.
 */
import Ember from 'ember';
import QUnit from 'qunit';

const ORIGNAL_THROWS = QUnit.assert.throws;

export default function installThrowsOverride() {
  QUnit.assert.throws = function assertThrowsOverride(cb, matcher, label) {
    const OPTIONS = Ember.run.backburner.options;
    const HAS_ERROR_METHOD_NAME =
      typeof OPTIONS.onErrorMethod === 'string' && OPTIONS.onErrorMethod.length > 0;
    const HAS_ERROR_METHOD =
      HAS_ERROR_METHOD_NAME &&
      OPTIONS.onErrorTarget &&
      typeof OPTIONS.onErrorTarget[OPTIONS.onErrorMethod] === 'function';
    const ORIGINAL_ERROR_METHOD_NAME = OPTIONS.onErrorMethod;
    const NEW_TARGET = {};
    const ORIGINAL_TARGET = OPTIONS.onErrorTarget;

    OPTIONS.onErrorTarget = NEW_TARGET;

    if (HAS_ERROR_METHOD) {
      OPTIONS.onErrorTarget[ORIGINAL_ERROR_METHOD_NAME] = undefined;
      OPTIONS[ORIGINAL_ERROR_METHOD_NAME] = undefined;
    }

    ORIGNAL_THROWS.call(this, cb, matcher, label);

    OPTIONS.onErrorMethod = ORIGINAL_ERROR_METHOD_NAME;
    OPTIONS.onErrorTarget = ORIGINAL_TARGET;
  };
}
