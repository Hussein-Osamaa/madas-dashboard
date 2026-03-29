// Firebase Auth removed. Use backend API instead.
export const USER_ROLES = { ADMIN: 'admin', MANAGER: 'manager', VIEWER: 'viewer' };
export const createUser = async () => { throw new Error('Firebase removed'); };
export const loginUser = async () => { throw new Error('Firebase removed'); };
export const signInUser = async () => { throw new Error('Firebase removed'); };
export const signOutUser = async () => {};
export const logoutUser = async () => {};
export const onAuthStateChange = (_cb) => () => {};
export const getUserData = async () => null;
export const updateUserProfile = async () => {};
export const changePassword = async () => {};
export const resetPassword = async () => {};
export const hasPermission = (_user, _resource, _action) => false;
export const isAdmin = (_user) => false;
export const isManager = (_user) => false;
