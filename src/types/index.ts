// ── Core domain enums ─────────────────────────────────────────────────────
export type AssetStatus = 'Available' | 'Assigned' | 'Under Repair' | 'Reserved' | 'Lost/Stolen' | 'Retired';
export type UpgradeType = 'Part Replaced' | 'Part Added';
/** Statuses that can be set manually (Assigned is system-controlled). */
export type ManualAssetStatus = Exclude<AssetStatus, 'Assigned'>;
export type DeviceType = 'Laptop' | 'Monitor' | 'Keyboard' | 'Mouse' | 'Phone' | 'Tablet' | 'Headset' | 'Docking Station' | 'Printer' | 'Camera' | 'Other';
export type UserRole = 'Admin' | 'Employee';
export type UserStatus = 'Active' | 'Inactive';
export type AssetCondition = 'New' | 'Good' | 'Fair' | 'Poor';
export type AttributeType = 'Text' | 'Number' | 'Date' | 'Dropdown';
export type CategoryStatusValue = 'Active' | 'Inactive';

// ── Mock / legacy types (used by not-yet-fully-migrated components) ────────

export interface CustomAttribute {
  id: string;
  label: string;
  type: AttributeType;
  required: boolean;
  value?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  customAttributes: Omit<CustomAttribute, 'value'>[];
  assetCount: number;
  status: 'Active' | 'Inactive';
  dateCreated: string;
}

export interface Designation {
  id: string;
  title: string;
  status: 'Active' | 'Inactive';
  lastModified: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  designationId: string;
  designationTitle: string;
  role: UserRole;
  status: UserStatus;
  avatarInitials?: string;
  avatarColor?: string;
}

export interface AssignmentRecord {
  id: string;
  assetId: string;
  employeeId: string;
  employeeName: string;
  employeeDesignation: string;
  assignedDate: string;
  expectedReturn?: string;
  actualReturn?: string;
  conditionAtAssignment: AssetCondition;
  conditionAtReturn?: AssetCondition;
  notes?: string;
  assignedBy: string;
  isActive: boolean;
}

export interface UpgradeLog {
  id: string;
  assetId: string;
  date: string;
  upgradeType: string;
  specBefore: string;
  specAfter: string;
  cost: number;
  vendor: string;
  loggedBy: string;
}

/** Legacy mock shape — used by mock-data.ts and not-yet-migrated drawers. */
export interface Asset {
  id: string;
  name: string;
  deviceType: DeviceType;
  brand: string;
  model: string;
  serialNumber: string;
  categoryId: string;
  categoryName: string;
  purchaseDate: string;
  purchasePrice?: number;
  vendor?: string;
  purchaseOrderRef?: string;
  warrantyStart?: string;
  warrantyExpiry?: string;
  warrantyProvider?: string;
  condition: AssetCondition;
  location: string;
  status: AssetStatus;
  assignedTo?: string;
  assignedToId?: string;
  assignedDate?: string;
  returnedDate?: string;
  registeredDate: string;
  registeredBy: string;
  lastModified: string;
  customAttributes?: CustomAttribute[];
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  email: string;
}

export type AppRole = 'admin' | 'employee';

// ── API response shapes — Categories ─────────────────────────────────────

/** Returned by GET /api/categories (list). */
export interface CategoryListItem {
  id: string;
  name: string;
  description: string;
  status: CategoryStatusValue;
  attributeCount: number;
  assetCount: number;
  createdAt: string;
}

/** Single option inside a Dropdown attribute. */
export interface AttributeOptionDetail {
  id: string;
  label: string;
  isActive: boolean;
}

/** Full attribute definition returned by GET /api/categories/:id. */
export interface AttributeDetail {
  id: string;
  label: string;
  type: AttributeType;
  isRequired: boolean;
  isActive: boolean;
  order: number;
  options: AttributeOptionDetail[];
}

/** Returned by GET /api/categories/:id, POST /api/categories, PATCH /api/categories/:id. */
export interface CategoryDetail {
  id: string;
  name: string;
  description: string;
  status: CategoryStatusValue;
  assetCount: number;
  attributes: AttributeDetail[];
  createdAt: string;
}

// ── API payload shapes — Categories ──────────────────────────────────────

export interface CreateAttributeOptionPayload {
  label: string;
}

export interface CreateAttributePayload {
  label: string;
  type: AttributeType;
  isRequired?: boolean;
  order?: number;
  options?: CreateAttributeOptionPayload[];
}

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  attributes?: CreateAttributePayload[];
}

export interface UpdateAttributeOptionPayload {
  id?: string; // omit for new options
  label: string;
}

export interface UpdateAttributePayload {
  id?: string; // omit to create new attribute
  label: string;
  type: AttributeType;
  isRequired?: boolean;
  order?: number;
  options?: UpdateAttributeOptionPayload[];
}

export interface UpdateCategoryPayload {
  name?: string;
  description?: string;
  attributes?: UpdateAttributePayload[];
}

// ── API response shapes — Assets ──────────────────────────────────────────

/** Returned in GET /api/assets list. */
export interface AssetListItem {
  id: string;
  displayId: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  category: { id: string; name: string };
  status: AssetStatus;
  condition: AssetCondition;
  location: string;
  warrantyExpiryDate: string | null;
  createdAt: string;
}

/** Custom attribute value returned in asset detail. */
export interface AssetCustomAttributeValue {
  attributeId: string;
  label: string;
  type: AttributeType;
  value: string;
}

/** Returned by GET /api/assets/:id, POST /api/assets, PATCH /api/assets/:id. */
export interface AssetDetail {
  id: string;
  displayId: string;
  name: string;
  description: string | null;
  brand: string;
  model: string;
  serialNumber: string;
  category: { id: string; name: string };
  status: AssetStatus;
  condition: AssetCondition;
  location: string | null;
  purchaseDate: string;
  purchasePrice: number;
  vendorName: string | null;
  purchaseOrderRef: string | null;
  warrantyStartDate: string | null;
  warrantyExpiryDate: string | null;
  warrantyProvider: string | null;
  customAttributes: AssetCustomAttributeValue[];
  assignmentHistoryCount: number;
  upgradeLogCount: number;
  createdBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ── API payload shapes — Assets ───────────────────────────────────────────

export interface AttributeValuePayload {
  attributeId: string;
  value: string;
}

export interface CreateAssetPayload {
  name: string;
  description?: string;
  brand: string;
  model: string;
  serialNumber: string;
  categoryId: string;
  condition: AssetCondition;
  location?: string;
  purchaseDate: string;
  purchasePrice: number;
  vendorName?: string;
  purchaseOrderRef?: string;
  warrantyStartDate?: string;
  warrantyExpiryDate?: string;
  warrantyProvider?: string;
  customAttributes?: AttributeValuePayload[];
}

export interface UpdateAssetPayload extends Partial<Omit<CreateAssetPayload, 'categoryId'>> {}

export interface UpdateAssetStatusPayload {
  status: ManualAssetStatus;
}

// ── Upgrades ──────────────────────────────────────────────────────────────

export interface AssetUpgrade {
  id: string;
  assetId: string;
  upgradeDate: string;
  upgradeType: UpgradeType;
  specBefore: string | null;
  specAfter: string;
  cost: number;
  vendorName: string;
  notes: string | null;
  loggedBy: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUpgradePayload {
  upgradeDate: string;
  upgradeType: UpgradeType;
  specBefore?: string;
  specAfter: string;
  cost: number;
  vendorName: string;
  notes?: string;
}

export interface UpdateUpgradePayload extends Partial<CreateUpgradePayload> {}

// ── Shared pagination ─────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Users ─────────────────────────────────────────────────────────────────

export interface DesignationListItem {
  id: string;
  name: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber?: string;
  designationId: string;
  role: UserRole;
  status?: UserStatus;
}

export interface CreateUserResponse {
  user: UserListItem;
  tempPassword: string;
}

export interface UserListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  designation: { id: string; name: string } | null;
  role: UserRole;
  status: UserStatus;
  profilePicture: string | null;
  isFirstLogin: boolean;
  createdAt: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isFirstLogin: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
