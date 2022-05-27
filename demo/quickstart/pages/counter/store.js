import Store from 'licheex';

export default new Store({
  connectGlobal: true,
  state: {
    value: 0,
  },
  getters: {
  },
  plugins: [
    // 'logger',
  ],
  mutations: {
    INCREMENT(state) {
      ++state.value
    },
    DECREMENT(state) {
      --state.value
    },
    REQUEST_ADD(state, { value }) {
      state.value += value;
    }
  },
  actions: {
    incrementAsync({ commit }) {
      setTimeout(function() {
        commit('INCREMENT');
      }, 1000);
    },
    async incrementRequest({ commit }) {
      const value = 1;
      commit('REQUEST_ADD', { value });
    }
  },
});
