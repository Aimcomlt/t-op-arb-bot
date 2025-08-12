import { create } from 'zustand';

export type Notification = {
  id: number;
  type: 'warning' | 'error';
  message: string;
};

interface NotificationState {
  notifications: Notification[];
  add: (n: Omit<Notification, 'id'>) => void;
  remove: (id: number) => void;
}

let idCounter = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  add: (n) =>
    set((state) => ({
      notifications: [...state.notifications, { ...n, id: ++idCounter }],
    })),
  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
