// frontend/src/store/index.ts

import { configureStore } from '@reduxjs/toolkit';
import abieReducer from './abieSlice';

const store = configureStore({
  reducer: {
    abie: abieReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
