import React, { createContext, useContext, useEffect, useReducer } from "react";

import firebase, { firestore } from "../firebase";
import { AuthContext } from "./AuthContext";

const SET_TASKS = "SET_TASKS";
const ERROR = "ERROR";
const CLEAR_TASKS = "CLEAR_TASKS";

export const TaskContext = createContext();

const reducer = (state, action) => {
  switch (action.type) {
    case SET_TASKS:
      return {
        ...state,
        tasks: action.payload,
        loading: false,
      };
    case CLEAR_TASKS:
      return {
        ...state,
        tasks: [],
        loading: true,
      };
    case ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

const initialState = {
  tasks: [],
  loading: true,
  error: null,
};

export const TaskProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user } = useContext(AuthContext);
  useEffect(() => {
    if (!user) return;

    const tasksSnapshot = firestore
      .collection("users")
      .doc(user.uid)
      .collection("tasks");
    const unsubscribe = tasksSnapshot
      .orderBy("created", "desc")
      .onSnapshot((snapshot) => {
        const tasks = snapshot.docs.map(
          (doc) => {
            return { id: doc.id, ...doc.data() };
          },
          (error) => {
            dispatch({ type: ERROR, payload: error.message });
          }
        );
        dispatch({ type: SET_TASKS, payload: tasks });
      });
    return () => unsubscribe();
  }, [dispatch, user]);

  const addTask = async (title) => {
    try {
      const tasksRef = firestore
        .collection("users")
        .doc(user.uid)
        .collection("tasks");
      await tasksRef.add({
        created: firebase.firestore.Timestamp.now(),
        title,
        completed: false,
      });
    } catch (error) {
      dispatch({ type: ERROR, payload: error.message });
    }
  };

  const toggleComplete = async ({ id, completed }) => {
    try {
      await firestore
        .collection("users")
        .doc(user.uid)
        .collection("tasks")
        .doc(id)
        .update({
          completed: !completed,
        });
    } catch (error) {
      dispatch({ type: ERROR, payload: error.message });
    }
  };

  const deleteTask = async ({ id }) => {
    try {
      await firestore
        .collection("users")
        .doc(user.uid)
        .collection("tasks")
        .doc(id)
        .delete();
    } catch (error) {
      dispatch({ type: ERROR, payload: error.message });
    }
  };

  const clearTasks = () => {
    dispatch({ type: CLEAR_TASKS });
  };

  const value = {
    tasks: state.tasks,
    loading: state.loading,
    error: state.error,
    addTask,
    toggleComplete,
    deleteTask,
    clearTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
};
