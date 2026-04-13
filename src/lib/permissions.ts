/**
 * AUTO-RBAC ENGINE — Central Permission Logic
 *
 * Format:  resource:role
 * Hierarchy: system > workspace > [project_basic | project_page] (horizontal)
 *
 * Roles:   owner > admin > member
 *
 * Inheritance:
 *   system:admin   → inherits into every workspace
 *   workspace:admin → inherits into every project_basic & project_page in that workspace
 *   project_basic ≠ project_page (independent / horizontal)
 */

// ─── Types ───────────────────────────────────────────────

export type RoleLevel = 'owner' | 'admin' | 'member';

export type ResourceType =
  | 'system'
  | 'workspace'
  | 'project_basic'
  | 'project_page';

export type RoleString = `${ResourceType}:${RoleLevel}`;

export type Action =
  | 'read'
  | 'create'
  | 'edit'
  | 'delete'          // delete sub-content (blocks, tasks, etc.)
  | 'delete_resource' // delete the resource itself (project, workspace)
  | 'manage_members'
  | 'billing';

// ─── Constants ───────────────────────────────────────────

const ROLE_HIERARCHY: Record<RoleLevel, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

/** Which resources are children of which parent */
const RESOURCE_CHILDREN: Record<string, ResourceType[]> = {
  system: ['workspace'],
  workspace: ['project_basic', 'project_page'],
};

// ─── Parsing ─────────────────────────────────────────────

export interface ParsedRole {
  resource: ResourceType;
  role: RoleLevel;
}

/**
 * Parse a "resource:role" string into its components.
 * Returns null for invalid strings.
 */
export function parseRole(roleString: string): ParsedRole | null {
  if (!roleString || !roleString.includes(':')) return null;

  const [resource, role] = roleString.split(':') as [string, string];

  const validResources: ResourceType[] = [
    'system',
    'workspace',
    'project_basic',
    'project_page',
  ];
  const validRoles: RoleLevel[] = ['owner', 'admin', 'member'];

  if (
    !validResources.includes(resource as ResourceType) ||
    !validRoles.includes(role as RoleLevel)
  ) {
    return null;
  }

  return { resource: resource as ResourceType, role: role as RoleLevel };
}

/**
 * Build a role string from resource + role.
 */
export function buildRole(resource: ResourceType, role: RoleLevel): RoleString {
  return `${resource}:${role}` as RoleString;
}

// ─── Hierarchy helpers ───────────────────────────────────

/**
 * Check if `userRole` is at least `minRole` in the hierarchy.
 * Compares only the role level, ignoring resource.
 *
 * Example: isAtLeast('project_basic:admin', 'member') → true
 */
export function isAtLeast(
  userRoleString: string,
  minRole: RoleLevel,
): boolean {
  const parsed = parseRole(userRoleString);
  if (!parsed) return false;
  return ROLE_HIERARCHY[parsed.role] >= ROLE_HIERARCHY[minRole];
}

/**
 * Get the numeric weight of a role level (for direct comparison).
 */
export function roleWeight(role: RoleLevel): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

// ─── Permission matrix ───────────────────────────────────

/**
 * Static permission matrix per role level.
 * `delete` for member requires an additional author check (see canDeleteContent).
 */
const PERMISSION_MATRIX: Record<RoleLevel, Set<Action>> = {
  owner: new Set([
    'read',
    'create',
    'edit',
    'delete',
    'delete_resource',
    'manage_members',
    'billing',
  ]),
  admin: new Set([
    'read',
    'create',
    'edit',
    'delete',
    'manage_members',
    // admin can delete_resource of CHILD resources only (handled in `can`)
  ]),
  member: new Set([
    'read',
    'create',
    'edit',
    // delete own content only (handled via canDeleteContent)
  ]),
};

// ─── Inheritance ─────────────────────────────────────────

/**
 * Check whether `parentResource` is an ancestor of `childResource`
 * in the hierarchy tree.
 */
function isAncestor(
  parentResource: ResourceType,
  childResource: ResourceType,
): boolean {
  const directChildren = RESOURCE_CHILDREN[parentResource];
  if (!directChildren) return false;
  if (directChildren.includes(childResource)) return true;

  // Recursive (system → workspace → project_*)
  return directChildren.some((child) => isAncestor(child, childResource));
}

/**
 * Resolve the effective role for a target resource, applying inheritance.
 *
 * If the user's role resource matches the target, return as-is.
 * If the user's role resource is an ancestor, inherit:
 *   - owner inherits as admin (not owner) into children
 *   - admin inherits as admin
 *   - member does NOT inherit
 *
 * Returns null if no effective role.
 */
export function resolveEffectiveRole(
  userRoleString: string,
  targetResource: ResourceType,
): ParsedRole | null {
  const parsed = parseRole(userRoleString);
  if (!parsed) return null;

  // Direct match
  if (parsed.resource === targetResource) return parsed;

  // Inheritance: ancestor → descendant
  if (isAncestor(parsed.resource, targetResource)) {
    if (parsed.role === 'owner' || parsed.role === 'admin') {
      // Inherited role caps at admin (owner doesn't propagate as owner)
      return { resource: targetResource, role: 'admin' };
    }
    // member does not inherit
    return null;
  }

  // Horizontal: project_basic ≠ project_page → no inheritance
  return null;
}

// ─── Core permission check ──────────────────────────────

/**
 * Central permission check.
 *
 * @param userRoleString  The user's role string (e.g. "workspace:admin")
 * @param action          The action to perform
 * @param targetResource  The resource being acted upon
 * @returns true if the user is allowed
 *
 * Note: For `delete` action by members, you must also call
 * `canDeleteContent()` to verify author ownership.
 */
export function can(
  userRoleString: string,
  action: Action,
  targetResource: ResourceType,
): boolean {
  const effective = resolveEffectiveRole(userRoleString, targetResource);
  if (!effective) return false;

  const { role } = effective;
  const allowed = PERMISSION_MATRIX[role];

  // Direct permission check
  if (allowed.has(action)) return true;

  // Special: admin can delete_resource of CHILD resources
  if (action === 'delete_resource' && role === 'admin') {
    // Admin at workspace can delete project_basic/project_page
    // Admin at system can delete workspace
    const children = RESOURCE_CHILDREN[effective.resource];
    if (children && children.includes(targetResource)) return true;

    // But admin cannot delete their OWN resource level
    return false;
  }

  return false;
}

// ─── Role management ────────────────────────────────────

/**
 * Check if an actor can manage (change/remove) a target role.
 *
 * Rules:
 * - owner can manage everyone
 * - admin can manage admin & member, but NOT owner
 * - member cannot manage anyone
 */
export function canManageRole(
  actorRoleString: string,
  targetRoleString: string,
): boolean {
  const actor = parseRole(actorRoleString);
  const target = parseRole(targetRoleString);
  if (!actor || !target) return false;

  // Must be same resource type
  if (actor.resource !== target.resource) return false;

  if (actor.role === 'owner') return true;

  if (actor.role === 'admin') {
    // Cannot touch owner
    return target.role !== 'owner';
  }

  return false;
}

// ─── Content ownership ──────────────────────────────────

/**
 * Check if a user can delete content based on their role and authorship.
 *
 * - owner/admin: can always delete
 * - member: only if they are the author (authorId === currentUserId)
 */
export function canDeleteContent(
  userRoleString: string,
  authorId: string,
  currentUserId: string,
): boolean {
  const parsed = parseRole(userRoleString);
  if (!parsed) return false;

  if (parsed.role === 'owner' || parsed.role === 'admin') return true;
  if (parsed.role === 'member') return authorId === currentUserId;

  return false;
}

// ─── Utility / Display ──────────────────────────────────

/**
 * Get a human-readable label for a role string.
 */
export function getRoleLabel(
  roleString: string,
  locale: 'vi' | 'en' = 'vi',
): string {
  const parsed = parseRole(roleString);
  if (!parsed) return roleString;

  const labels: Record<RoleLevel, { vi: string; en: string }> = {
    owner: { vi: 'Chủ sở hữu', en: 'Owner' },
    admin: { vi: 'Quản trị viên', en: 'Admin' },
    member: { vi: 'Thành viên', en: 'Member' },
  };

  return labels[parsed.role]?.[locale] ?? roleString;
}

/**
 * Get all valid role strings for a given resource.
 */
export function getRolesForResource(resource: ResourceType): RoleString[] {
  const levels: RoleLevel[] = ['owner', 'admin', 'member'];
  return levels.map((level) => buildRole(resource, level));
}
