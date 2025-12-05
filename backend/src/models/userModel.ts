export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: 'google' | 'microsoft';
  providerId: string;
  role: 'viewer' | 'editor' | 'admin';
  departmentId?: string;
  preferences: {
    defaultView: string;
    autoSaveInterval: number;
    theme: 'light' | 'dark';
    chatPosition: 'right' | 'left' | 'bottom';
  };
  createdAt: Date;
  lastLoginAt: Date;
}

// In-memory user storage (will be replaced with database)
class UserStore {
  private users: Map<string, User> = new Map();

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  findByProviderId(provider: 'google' | 'microsoft', providerId: string): User | undefined {
    return Array.from(this.users.values()).find(
      (user) => user.provider === provider && user.providerId === providerId
    );
  }

  create(userData: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>): User {
    const user: User = {
      ...userData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  update(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  updateLastLogin(id: string): void {
    const user = this.users.get(id);
    if (user) {
      user.lastLoginAt = new Date();
      this.users.set(id, user);
    }
  }

  delete(id: string): boolean {
    return this.users.delete(id);
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }
}

export const userStore = new UserStore();
