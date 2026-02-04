export interface Permission {
  _id: string;
  code: string;
  name: string;
  description?: string;
}
export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
}
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  roles: Role[];
  permissions: EffectivePermissions;
}
export interface EffectivePermissions {
  isSuperAdmin: boolean;
  rolePermissions?: string[];
  directAllowed?: string[];
  directDenied?: string[];
  effectivePermissions?: string[];
  permissions?: string; // "ALL" for super admin
}
export interface LoginResponse {
  status: string;
  message?: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      username: string;
      email?: string;
      isSuperAdmin: boolean;
    };
  };
}
export interface MeResponse {
  status: string;
  data?: {
    user: AuthUser;
  };
}