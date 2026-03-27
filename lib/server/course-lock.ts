import { createResourceLock } from './resource-lock';

export const withCourseLock = createResourceLock<string>();
