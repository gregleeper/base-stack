# Group Creation and Edit Implementation Plan

## Overview

This document outlines the implementation plan for creating and editing user groups in the resource scheduling application. The functionality will follow patterns established in other admin sections like role management.

## Data Model

The existing data model includes:

- **UserGroup**: Main entity with name, description, and audit fields
- **UserGroupMember**: Junction table for users in groups
- **ResourceAccess**: Controls what resources a group can access and with what permissions

## Implementation Steps

### 1. New Group Page (`/admin/groups/new`)

#### File Structure
- Create `app/routes/admin/groups/new.tsx`
- Add types in `app/routes/admin/groups/+types/new.ts` (React Router v7 will generate these)

#### Components
1. **Loader**
   - Check user permission (require Administrator role)
   - Fetch all users for member selection

2. **Action**
   - Validate form data (name required, unique)
   - Create new UserGroup record
   - Create UserGroupMember records for selected members
   - Create ResourceAccess records if applicable
   - Redirect to group details view on success

3. **Component UI**
   - Form with sections:
     - Basic Information (name, description)
     - Member Management (add/remove users)
     - Resource Access (optional)
   - Cancel and Submit buttons

#### Form Implementation with Conform and Zod
```tsx
// Define the validation schema with Zod
const groupSchema = z.object({
  name: z.string().min(1, { message: "Group name is required" }),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional().default([])
});

// In the component
const [form, { name, description, memberIds }] = useForm({
  id: "new-group-form",
  onValidate({ formData }) {
    return parseWithZod(formData, { schema: groupSchema });
  },
  defaultValue: {
    name: "",
    description: "",
    memberIds: "[]" // Will be parsed as JSON
  },
  shouldValidate: "onBlur",
  shouldRevalidate: "onInput",
  lastResult: actionData?.submission,
});
```

### 2. Edit Group Page (`/admin/groups/edit`)

#### File Structure
- Create `app/routes/admin/groups/edit.tsx`
- Add types in `app/routes/admin/groups/+types/edit.ts`

#### Components
1. **Loader**
   - Check user permission
   - Get group ID from URL params
   - Fetch group with its members
   - Fetch all users for member selection
   - Fetch resource access records

2. **Action**
   - Validate form data
   - Update UserGroup record
   - Handle member changes (add/remove)
   - Handle resource access changes
   - Transaction to ensure all operations succeed
   - Redirect to group details view on success

3. **Component UI**
   - Similar to new group form
   - Pre-populate with existing data
   - Show current members with remove option
   - Show current resource access settings

#### Form Pre-population for Edit
```tsx
// Setup form with prefilled values from the existing group
const [form, fields] = useForm({
  id: "edit-group-form",
  defaultValue: {
    name: group.name,
    description: group.description || "",
    memberIds: JSON.stringify(group.members.map(member => member.userId))
  },
  shouldValidate: "onBlur",
  onValidate({ formData }) {
    return parseWithZod(formData, { schema: groupSchema });
  },
  lastResult: actionData?.submission,
});

// For multi-select component (members)
const [selectedMemberIds, setSelectedMemberIds] = useState(
  group.members.map(member => member.userId)
);
```

### 3. Group List Page (`/admin/groups`)

#### Updates
- Add create group button
- Add edit/view buttons for each group

### 4. Group Detail View (`/admin/groups/:groupId/view`)

#### Components
1. **Loader**
   - Fetch group details with members and resource access
   - Permission check

2. **Component UI**
   - Display group information
   - List members
   - Show resource access
   - Edit and Delete buttons

## Implementation Details

### Form Validation
- Use Conform library with Zod schemas for client and server validation
- Implement validation schema:
  ```tsx
  const groupSchema = z.object({
    name: z.string().min(1, { message: "Group name is required" })
      .refine(async (name) => {
        // Check for unique name (for new groups or name changes)
        const existing = await prisma.userGroup.findFirst({
          where: {
            name,
            ...(groupId ? { id: { not: groupId } } : {})
          }
        });
        return !existing;
      }, "A group with this name already exists"),
    description: z.string().optional(),
    memberIds: z.array(z.string()).min(1, "Group must have at least one member")
  });
  ```
- Process multi-select fields in form submission
- Handle boolean toggle fields
- Show validation errors with appropriate styling

### Member Management UI
- Multi-select component for users
- Search/filter capability for large user lists
- Show selected members with remove option
- Process member IDs in form submission:
  ```tsx
  // In the form's onValidate function
  const processMultiSelect = (fieldName: string): void => {
    const value = formData.get(fieldName);
    formData.delete(fieldName);

    if (!value) return;

    let valuesArray: string[] = [];
    try {
      valuesArray = JSON.parse(value as string);
    } catch {
      valuesArray = [value as string];
    }

    for (const val of valuesArray) {
      if (val) formData.append(fieldName, val);
    }
  };

  processMultiSelect("memberIds");
  ```

### Resource Access UI
- Table view of resources
- Toggles for different permission levels (view, book, approve, manage)
- Grouped by resource type

### Permission Handling
- Check for Administrator role in loaders and actions
- Consider more granular permissions (can-manage-groups)

## Routes Structure

```
/admin/groups
/admin/groups/new
/admin/groups/:groupId/view
/admin/groups/:groupId/edit
```

## UI Components Needed

- Form layout with sections
- User selection component with search
- Permission toggle grid
- Confirmation dialog for deletions

## Testing Plan

1. Unit tests for validation logic
2. Integration tests for group CRUD operations
3. UI tests for form submission and error states
4. Permission tests

## Deployment Considerations

- Database migrations (none needed as schema already includes UserGroup)
- Permission updates for existing roles