export type AssetStatus = 'Available' | 'Assigned' | 'Under Repair' | 'Reserved' | 'Lost/Stolen' | 'Retired';
export type DeviceType = 'Laptop' | 'Monitor' | 'Keyboard' | 'Mouse' | 'Phone' | 'Tablet' | 'Headset' | 'Docking Station' | 'Printer' | 'Camera' | 'Other';
export type UserRole = 'Admin' | 'Employee';
export type UserStatus = 'Active' | 'Inactive';
export type AssetCondition = 'New' | 'Good' | 'Fair' | 'Poor';
export type AttributeType = 'Text' | 'Number' | 'Date' | 'Dropdown';

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

export type CategoryStatusValue = 'Active' | 'Inactive';

// Shape returned by the backend GET /api/categories list endpoint (OAMS-69).
// Distinct from the mock `Category` type used by the not-yet-wired pages.
export interface CategoryListItem {
  id: string;
  name: string;
  description: string;
  status: CategoryStatusValue;
  attributeCount: number;
  assetCount: number;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
