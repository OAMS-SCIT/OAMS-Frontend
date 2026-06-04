import { Asset, AssignmentRecord, Category, Designation, UpgradeLog, User } from '@/types';

export const mockDesignations: Designation[] = [
  { id: 'des1', title: 'Software Engineer', status: 'Active', lastModified: '2024-11-01' },
  { id: 'des2', title: 'QA Engineer', status: 'Active', lastModified: '2024-10-15' },
  { id: 'des3', title: 'Product Designer', status: 'Active', lastModified: '2024-09-20' },
  { id: 'des4', title: 'Marketing Specialist', status: 'Active', lastModified: '2024-08-05' },
  { id: 'des5', title: 'IT Administrator', status: 'Active', lastModified: '2024-07-12' },
  { id: 'des6', title: 'Project Manager', status: 'Active', lastModified: '2024-06-18' },
  { id: 'des7', title: 'Data Analyst', status: 'Inactive', lastModified: '2024-05-30' },
];

export const mockUsers: User[] = [
  {
    id: 'usr1', firstName: 'Alex', lastName: 'Rivera', email: 'alex.rivera@company.com',
    contactNumber: '+1 (555) 001-0001', designationId: 'des5', designationTitle: 'IT Administrator',
    role: 'Admin', status: 'Active', avatarInitials: 'AR', avatarColor: '#1E3A8A',
  },
  {
    id: 'usr2', firstName: 'John', lastName: 'Doe', email: 'john.doe@company.com',
    contactNumber: '+1 (555) 001-0002', designationId: 'des1', designationTitle: 'Software Engineer',
    role: 'Employee', status: 'Active', avatarInitials: 'JD', avatarColor: '#3B82F6',
  },
  {
    id: 'usr3', firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@company.com',
    contactNumber: '+1 (555) 001-0003', designationId: 'des2', designationTitle: 'QA Engineer',
    role: 'Employee', status: 'Active', avatarInitials: 'JS', avatarColor: '#10B981',
  },
  {
    id: 'usr4', firstName: 'Mike', lastName: 'Johnson', email: 'mike.johnson@company.com',
    contactNumber: '+1 (555) 001-0004', designationId: 'des3', designationTitle: 'Product Designer',
    role: 'Employee', status: 'Active', avatarInitials: 'MJ', avatarColor: '#8B5CF6',
  },
  {
    id: 'usr5', firstName: 'Sarah', lastName: 'Williams', email: 'sarah.williams@company.com',
    contactNumber: '+1 (555) 001-0005', designationId: 'des4', designationTitle: 'Marketing Specialist',
    role: 'Employee', status: 'Inactive', avatarInitials: 'SW', avatarColor: '#F59E0B',
  },
  {
    id: 'usr6', firstName: 'David', lastName: 'Brown', email: 'david.brown@company.com',
    contactNumber: '+1 (555) 001-0006', designationId: 'des1', designationTitle: 'Software Engineer',
    role: 'Employee', status: 'Active', avatarInitials: 'DB', avatarColor: '#EF4444',
  },
  {
    id: 'usr7', firstName: 'Emma', lastName: 'Wilson', email: 'emma.wilson@company.com',
    contactNumber: '+1 (555) 001-0007', designationId: 'des6', designationTitle: 'Project Manager',
    role: 'Admin', status: 'Active', avatarInitials: 'EW', avatarColor: '#0F2460',
  },
];

export const mockCategories: Category[] = [
  {
    id: 'cat1', name: 'Laptops', description: 'Portable computing devices including notebooks and ultrabooks',
    customAttributes: [
      { id: 'a1', label: 'Processor', type: 'Text', required: true },
      { id: 'a2', label: 'RAM (GB)', type: 'Number', required: true },
      { id: 'a3', label: 'Storage (GB)', type: 'Number', required: true },
      { id: 'a4', label: 'OS', type: 'Dropdown', required: false },
    ],
    assetCount: 42, status: 'Active', dateCreated: '2023-01-10',
  },
  {
    id: 'cat2', name: 'Monitors', description: 'Desktop and workstation display screens',
    customAttributes: [
      { id: 'b1', label: 'Screen Size (inches)', type: 'Number', required: true },
      { id: 'b2', label: 'Resolution', type: 'Text', required: true },
      { id: 'b3', label: 'Panel Type', type: 'Dropdown', required: false },
    ],
    assetCount: 35, status: 'Active', dateCreated: '2023-01-10',
  },
  {
    id: 'cat3', name: 'Phones', description: 'Mobile phones and smartphones',
    customAttributes: [
      { id: 'c1', label: 'Storage (GB)', type: 'Number', required: false },
      { id: 'c2', label: 'SIM Type', type: 'Dropdown', required: false },
    ],
    assetCount: 28, status: 'Active', dateCreated: '2023-02-14',
  },
  {
    id: 'cat4', name: 'Peripherals', description: 'Keyboards, mice, headsets, and other accessories',
    customAttributes: [
      { id: 'd1', label: 'Connection Type', type: 'Dropdown', required: false },
    ],
    assetCount: 21, status: 'Active', dateCreated: '2023-03-05',
  },
  {
    id: 'cat5', name: 'Other', description: 'Miscellaneous office and IT assets',
    customAttributes: [],
    assetCount: 17, status: 'Active', dateCreated: '2023-04-20',
  },
];

export const mockAssets: Asset[] = [
  {
    id: 'AST-001', name: 'Dell XPS 15 Laptop', deviceType: 'Laptop', brand: 'Dell', model: 'XPS 15 9530',
    serialNumber: 'DL-123456789', categoryId: 'cat1', categoryName: 'Laptops',
    purchaseDate: '2024-01-15', purchasePrice: 1899.99, vendor: 'Dell Technologies',
    purchaseOrderRef: 'PO-2024-001', warrantyStart: '2024-01-15', warrantyExpiry: '2027-01-15',
    warrantyProvider: 'Dell Premier Support', condition: 'Good', location: 'Office 3A',
    status: 'Assigned', assignedTo: 'John Doe', assignedToId: 'usr2', assignedDate: '2024-01-20',
    registeredDate: '2024-01-16', registeredBy: 'Alex Rivera', lastModified: '2024-01-20',
    customAttributes: [
      { id: 'a1', label: 'Processor', type: 'Text', required: true, value: 'Intel Core i9-13900H' },
      { id: 'a2', label: 'RAM (GB)', type: 'Number', required: true, value: '32' },
      { id: 'a3', label: 'Storage (GB)', type: 'Number', required: true, value: '1024' },
      { id: 'a4', label: 'OS', type: 'Dropdown', required: false, value: 'Windows 11 Pro' },
    ],
  },
  {
    id: 'AST-002', name: 'LG UltraWide Monitor', deviceType: 'Monitor', brand: 'LG', model: 'UltraWide 34WQ75C',
    serialNumber: 'LG-987654321', categoryId: 'cat2', categoryName: 'Monitors',
    purchaseDate: '2024-02-10', purchasePrice: 649.99, vendor: 'B&H Photo',
    warrantyStart: '2024-02-10', warrantyExpiry: '2025-02-10',
    warrantyProvider: 'LG Service Center', condition: 'Good', location: 'Office 2B',
    status: 'Assigned', assignedTo: 'Jane Smith', assignedToId: 'usr3', assignedDate: '2024-02-15',
    registeredDate: '2024-02-11', registeredBy: 'Alex Rivera', lastModified: '2024-02-15',
    customAttributes: [
      { id: 'b1', label: 'Screen Size (inches)', type: 'Number', required: true, value: '34' },
      { id: 'b2', label: 'Resolution', type: 'Text', required: true, value: '3440x1440' },
      { id: 'b3', label: 'Panel Type', type: 'Dropdown', required: false, value: 'IPS' },
    ],
  },
  {
    id: 'AST-003', name: 'MacBook Pro 16"', deviceType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 16" M3',
    serialNumber: 'MB-456789123', categoryId: 'cat1', categoryName: 'Laptops',
    purchaseDate: '2024-03-05', purchasePrice: 2499.00, vendor: 'Apple Store',
    warrantyStart: '2024-03-05', warrantyExpiry: '2026-03-05',
    warrantyProvider: 'AppleCare+', condition: 'New', location: 'IT Storage',
    status: 'Available',
    registeredDate: '2024-03-06', registeredBy: 'Alex Rivera', lastModified: '2024-03-06',
    customAttributes: [
      { id: 'a1', label: 'Processor', type: 'Text', required: true, value: 'Apple M3 Pro' },
      { id: 'a2', label: 'RAM (GB)', type: 'Number', required: true, value: '36' },
      { id: 'a3', label: 'Storage (GB)', type: 'Number', required: true, value: '512' },
      { id: 'a4', label: 'OS', type: 'Dropdown', required: false, value: 'macOS Sonoma' },
    ],
  },
  {
    id: 'AST-004', name: 'iPhone 15 Pro', deviceType: 'Phone', brand: 'Apple', model: 'iPhone 15 Pro',
    serialNumber: 'IP-789123456', categoryId: 'cat3', categoryName: 'Phones',
    purchaseDate: '2024-01-25', purchasePrice: 999.00, vendor: 'Apple Store',
    warrantyStart: '2024-01-25', warrantyExpiry: '2026-01-25',
    warrantyProvider: 'AppleCare', condition: 'Fair', location: 'IT Repair Desk',
    status: 'Under Repair',
    registeredDate: '2024-01-26', registeredBy: 'Alex Rivera', lastModified: '2024-04-10',
  },
  {
    id: 'AST-005', name: 'Samsung 27" 4K Monitor', deviceType: 'Monitor', brand: 'Samsung', model: 'ViewFinity S8',
    serialNumber: 'SM-321654987', categoryId: 'cat2', categoryName: 'Monitors',
    purchaseDate: '2022-06-10', purchasePrice: 799.99, vendor: 'Samsung Direct',
    warrantyStart: '2022-06-10', warrantyExpiry: '2024-06-10',
    warrantyProvider: 'Samsung Support', condition: 'Poor', location: 'Storage Room B',
    status: 'Retired',
    registeredDate: '2022-06-11', registeredBy: 'Alex Rivera', lastModified: '2025-01-15',
  },
  {
    id: 'AST-006', name: 'Logitech MX Keys Keyboard', deviceType: 'Keyboard', brand: 'Logitech', model: 'MX Keys S',
    serialNumber: 'LT-654321789', categoryId: 'cat4', categoryName: 'Peripherals',
    purchaseDate: '2024-04-01', purchasePrice: 119.99, vendor: 'Logitech Store',
    warrantyStart: '2024-04-01', warrantyExpiry: '2026-04-01',
    warrantyProvider: 'Logitech Warranty', condition: 'New', location: 'IT Storage',
    status: 'Available',
    registeredDate: '2024-04-02', registeredBy: 'Alex Rivera', lastModified: '2024-04-02',
  },
  {
    id: 'AST-007', name: 'Sony WH-1000XM5 Headset', deviceType: 'Headset', brand: 'Sony', model: 'WH-1000XM5',
    serialNumber: 'SN-147258369', categoryId: 'cat4', categoryName: 'Peripherals',
    purchaseDate: '2024-03-20', purchasePrice: 349.99, vendor: 'Sony Direct',
    warrantyStart: '2024-03-20', warrantyExpiry: '2025-03-20',
    warrantyProvider: 'Sony Service', condition: 'Good', location: 'Office 4C',
    status: 'Assigned', assignedTo: 'Mike Johnson', assignedToId: 'usr4', assignedDate: '2024-03-25',
    registeredDate: '2024-03-21', registeredBy: 'Alex Rivera', lastModified: '2024-03-25',
  },
  {
    id: 'AST-008', name: 'HP EliteBook 840', deviceType: 'Laptop', brand: 'HP', model: 'EliteBook 840 G10',
    serialNumber: 'HP-258369147', categoryId: 'cat1', categoryName: 'Laptops',
    purchaseDate: '2024-02-20', purchasePrice: 1399.99, vendor: 'HP Inc.',
    warrantyStart: '2024-02-20', warrantyExpiry: '2027-02-20',
    warrantyProvider: 'HP Care Pack', condition: 'Good', location: 'IT Storage',
    status: 'Available',
    registeredDate: '2024-02-21', registeredBy: 'Alex Rivera', lastModified: '2024-02-21',
    customAttributes: [
      { id: 'a1', label: 'Processor', type: 'Text', required: true, value: 'Intel Core i7-1365U' },
      { id: 'a2', label: 'RAM (GB)', type: 'Number', required: true, value: '16' },
      { id: 'a3', label: 'Storage (GB)', type: 'Number', required: true, value: '512' },
      { id: 'a4', label: 'OS', type: 'Dropdown', required: false, value: 'Windows 11 Pro' },
    ],
  },
  {
    id: 'AST-009', name: 'Dell UltraSharp 32"', deviceType: 'Monitor', brand: 'Dell', model: 'UltraSharp U3223QE',
    serialNumber: 'DL-999888777', categoryId: 'cat2', categoryName: 'Monitors',
    purchaseDate: '2024-05-01', purchasePrice: 899.99, vendor: 'Dell Technologies',
    warrantyStart: '2024-05-01', warrantyExpiry: '2027-05-01',
    warrantyProvider: 'Dell Premium Support', condition: 'New', location: 'Office 1A',
    status: 'Assigned', assignedTo: 'David Brown', assignedToId: 'usr6', assignedDate: '2024-05-10',
    registeredDate: '2024-05-02', registeredBy: 'Emma Wilson', lastModified: '2024-05-10',
  },
  {
    id: 'AST-010', name: 'iPad Pro 12.9"', deviceType: 'Tablet', brand: 'Apple', model: 'iPad Pro 12.9" M2',
    serialNumber: 'AP-111222333', categoryId: 'cat5', categoryName: 'Other',
    purchaseDate: '2023-12-01', purchasePrice: 1099.00, vendor: 'Apple Store',
    warrantyStart: '2023-12-01', warrantyExpiry: '2025-12-01',
    warrantyProvider: 'AppleCare', condition: 'Good', location: 'Conference Room B',
    status: 'Reserved',
    registeredDate: '2023-12-02', registeredBy: 'Alex Rivera', lastModified: '2024-01-10',
  },
];

export const mockAssignmentHistory: AssignmentRecord[] = [
  {
    id: 'asgn1', assetId: 'AST-001', employeeId: 'usr2', employeeName: 'John Doe',
    employeeDesignation: 'Software Engineer', assignedDate: '2024-01-20', expectedReturn: '2025-01-20',
    conditionAtAssignment: 'Good', notes: 'Includes charger and sleeve case', assignedBy: 'Alex Rivera', isActive: true,
  },
  {
    id: 'asgn2', assetId: 'AST-002', employeeId: 'usr3', employeeName: 'Jane Smith',
    employeeDesignation: 'QA Engineer', assignedDate: '2024-02-15', expectedReturn: '2025-02-15',
    conditionAtAssignment: 'Good', notes: 'With HDMI cable', assignedBy: 'Alex Rivera', isActive: true,
  },
  {
    id: 'asgn3', assetId: 'AST-007', employeeId: 'usr4', employeeName: 'Mike Johnson',
    employeeDesignation: 'Product Designer', assignedDate: '2024-03-25', expectedReturn: '2025-03-25',
    conditionAtAssignment: 'Good', notes: 'Includes carrying case', assignedBy: 'Alex Rivera', isActive: true,
  },
  {
    id: 'asgn4', assetId: 'AST-009', employeeId: 'usr6', employeeName: 'David Brown',
    employeeDesignation: 'Software Engineer', assignedDate: '2024-05-10', expectedReturn: '2025-05-10',
    conditionAtAssignment: 'New', notes: 'New purchase, direct assignment', assignedBy: 'Emma Wilson', isActive: true,
  },
  {
    id: 'asgn5', assetId: 'AST-001', employeeId: 'usr3', employeeName: 'Jane Smith',
    employeeDesignation: 'QA Engineer', assignedDate: '2023-06-01', expectedReturn: '2024-01-19',
    actualReturn: '2024-01-19', conditionAtAssignment: 'New', conditionAtReturn: 'Good',
    notes: 'Initial assignment', assignedBy: 'Alex Rivera', isActive: false,
  },
];

export const mockUpgradeLogs: UpgradeLog[] = [
  {
    id: 'upl1', assetId: 'AST-001', date: '2024-06-15', upgradeType: 'RAM Upgrade',
    specBefore: '16GB DDR5', specAfter: '32GB DDR5', cost: 249.99, vendor: 'Kingston',
    loggedBy: 'Alex Rivera',
  },
  {
    id: 'upl2', assetId: 'AST-001', date: '2024-08-20', upgradeType: 'Storage Upgrade',
    specBefore: '512GB NVMe', specAfter: '1TB NVMe', cost: 159.99, vendor: 'Samsung',
    loggedBy: 'Alex Rivera',
  },
  {
    id: 'upl3', assetId: 'AST-008', date: '2024-07-10', upgradeType: 'RAM Upgrade',
    specBefore: '8GB DDR5', specAfter: '16GB DDR5', cost: 99.99, vendor: 'Crucial',
    loggedBy: 'Emma Wilson',
  },
];

export const mockEmployees = mockUsers.filter(u => u.role === 'Employee');

export const currentEmployeeUser = mockUsers.find(u => u.id === 'usr2')!;
export const currentAdminUser = mockUsers.find(u => u.id === 'usr1')!;
