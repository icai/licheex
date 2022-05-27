import Store from 'licheex';
import { VisibilityFilters } from '../../constants/index';

let nextTodoId = 0

export default new Store({
  connectGlobal: true,
  state: {
    cardDetail: {
      id:1234,
      xxInfo: {
        detail: {
          name: 'xxx'
        }
      }
    },
    todos: [],
    visibilityFilter: VisibilityFilters.SHOW_ALL
  },
  getters: {
    // counts: state => {
    //   console.log(state)
    //   console.log(state.getIn('todos'))
    //   return state.getIn('todos').length
    // } ,
    // cardDetailName: state => state.getIn(['cardDetail', 'xxInfo', 'detail', 'name'], ''),
  },
  plugins: [
    'logger',
  ],
  mutations: {
    setVisibilityFilter(state, payload) {
      state.visibilityFilter = payload;
    },
    addToDo(state, payload) {
      state.todos.push({
        id: nextTodoId++,
        text: payload,
        completed: false
      });
    },
    toggleTodo(state, payload) {
      state.todos.forEach(todo => {
        if (todo.id === payload) {
          todo.completed = !todo.completed
        }
      });
    }
  },
  actions: {
    incrementAsync({ commit }) {
      setTimeout(function() {
        commit('INCREMENT');
      }, 1000);
    }
  },
});
