/**
 * Centralized role label utilities for AUTO-RBAC ENGINE.
 * Format: resource:role
 *
 * Hierarchy: system > workspace > [project_basic | project_page] (horizontal)
 *
 * System roles (user_roles table): system:owner, system:admin
 * Workspace roles (workspace_members): workspace:owner, workspace:admin, workspace:member
 * Project roles (group_members): project_basic:owner, project_basic:admin, project_basic:member
 * Page roles: project_page:owner, project_page:admin, project_page:member
 */

/** Get display label for a system-level role */
export function getSystemRoleLabel(role: string): string {
  switch (role) {
    case 'system:owner': return 'System Owner';
    case 'system:admin': return 'System Admin';
    default: return role;
  }
}

/** Get display label for a workspace-level role */
export function getWorkspaceRoleLabel(role: string): string {
  switch (role) {
    case 'workspace:owner': return 'Owner';
    case 'workspace:admin': return 'Admin';
    case 'workspace:member': return 'Thành viên';
    default: return role;
  }
}

/**
 * Get display label for a project-level role (project_basic).
 * @param role - The role from group_members
 * @param isCreator - Whether this member is the project creator (created_by)
 */
export function getProjectRoleLabel(role: string, isCreator: boolean = false): string {
  if (isCreator) return 'Trưởng dự án';
  switch (role) {
    case 'project_basic:owner': return 'Trưởng dự án';
    case 'project_basic:admin': return 'Phó dự án';
    case 'project_basic:member': return 'Thành viên';
    case 'project_basic:guest': return 'Khách';
    default: return role;
  }
}

/** Get display label for a page-level role (project_page) */
export function getPageRoleLabel(role: string): string {
  switch (role) {
    case 'project_page:owner': return 'Page Owner';
    case 'project_page:admin': return 'Page Admin';
    case 'project_page:member': return 'Page Member';
    default: return role;
  }
}

// Re-export from central config
export { getPlanLabel as getUserPlanLabel } from '@/lib/planConfig';
