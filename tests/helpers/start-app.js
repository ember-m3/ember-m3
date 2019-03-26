import { run } from '@ember/runloop';
import { assign, merge } from '@ember/polyfills';
import Application from '../../app';
import config from '../../config/environment';

const emberAssign = assign || merge;

export default function startApp(attrs) {
  let attributes = emberAssign({}, config.APP);
  attributes = emberAssign(attributes, attrs); // use defaults, but you can override;

  return run(() => {
    let application = Application.create(attributes);
    application.setupForTesting();
    application.injectTestHelpers();
    return application;
  });
}
