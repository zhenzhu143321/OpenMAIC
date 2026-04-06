export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'pending_review' | 'disabled';

export interface User {
  id: string;           // format: user_<nanoid(10)>
  username: string;     // unique, 3-32 chars, alphanumeric + underscore
  passwordHash: string; // bcrypt hash, cost factor 12
  displayName: string;  // 1-64 chars
  role: UserRole;
  status: UserStatus;
  createdAt: string;    // ISO 8601
  updatedAt: string;
}

// Never expose passwordHash to clients
export type SafeUser = Omit<User, 'passwordHash'>;

// Stored in encrypted iron-session cookie
// Only userId — role/status are always read from disk on each request
export interface SessionData {
  userId: string;
}
