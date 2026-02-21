import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where
} from '../lib/firebase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type DashboardTask = {
  id: string;
  task: string;
  completed?: boolean;
};

export const dashboardTasksKey = (businessId?: string, userId?: string) => [
  'dashboard',
  'tasks',
  businessId,
  userId
] as const;

export const useDashboardTasks = (businessId?: string, userId?: string) => {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: dashboardTasksKey(businessId, userId),
    enabled: Boolean(businessId && userId),
    queryFn: async () => {
      if (!businessId || !userId) {
        return [] as DashboardTask[];
      }

      const todosRef = collection(db, 'businesses', businessId, 'todos');
      const todosQuery = query(todosRef, where('uid', '==', userId));
      const snapshot = await getDocs(todosQuery);

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          task: (data.task as string) ?? '',
          completed: (data.completed as boolean) ?? false
        };
      });
    },
    initialData: [] as DashboardTask[]
  });

  const addTaskMutation = useMutation({
    mutationFn: async (task: string) => {
      if (!businessId || !userId) {
        throw new Error('Missing business or user context');
      }

      const todosRef = collection(db, 'businesses', businessId, 'todos');
      await addDoc(todosRef, {
        uid: userId,
        task,
        completed: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardTasksKey(businessId, userId) });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!businessId) {
        throw new Error('Missing business context');
      }

      const taskRef = doc(db, 'businesses', businessId, 'todos', taskId);
      await deleteDoc(taskRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardTasksKey(businessId, userId) });
    }
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      if (!businessId) {
        throw new Error('Missing business context');
      }

      const taskRef = doc(db, 'businesses', businessId, 'todos', taskId);
      await updateDoc(taskRef, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardTasksKey(businessId, userId) });
    }
  });

  return {
    tasks: tasksQuery.data ?? [],
    isLoading: tasksQuery.isLoading,
    addTask: addTaskMutation.mutateAsync,
    adding: addTaskMutation.isPending,
    deleteTask: deleteTaskMutation.mutateAsync,
    deleting: deleteTaskMutation.isPending,
    toggleTask: toggleTaskMutation.mutateAsync,
    toggling: toggleTaskMutation.isPending
  };
};

