import { connect } from 'licheex';

const withStore = connect({
  mapStateToProps: {
    active: (state, _, props) => {
      return props.getIn('filter') === state.getIn('visibilityFilter');
    }
  },
  props: {
    filter: ""
  },
  methods: {
    onTapFilter() {
      console.log('setVisibilityFilter');
      this.commit('setVisibilityFilter', this.props.filter);
    }
  }
});

Component(withStore());