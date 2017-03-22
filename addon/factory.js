import Model from './model';

export default {
  class: Model,

  create(props) {
    return new Model(props);
  },
};
