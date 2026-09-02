import { apiClient } from './apiClient'

export interface AdminUser {
  id: string
  email: string
  role: 'student' | 'authority' | 'admin'
  is_active: boolean
  full_name: string | null
  created_at: string
}

export const adminApi = {
  async listUsers(): Promise<AdminUser[]> {
    const { data } = await apiClient.get<AdminUser[]>('/admin/users')
    return data
  },
  async createAuthority(input: {
    full_name: string
    email: string
    password: string
    department?: string
  }): Promise<AdminUser> {
    const { data } = await apiClient.post<AdminUser>('/admin/authorities', input)
    return data
  },
  async setActive(userId: string, is_active: boolean): Promise<AdminUser> {
    const { data } = await apiClient.patch<AdminUser>(`/admin/users/${userId}`, { is_active })
    return data
  },
}
