import * as fs from 'fs';
import * as path from 'path';
import { USERS, INITIAL_DEPARTMENTS, INITIAL_JOB_TITLES, WORKFLOW_TEMPLATES, INITIAL_DOCUMENTS, INITIAL_NOTIFICATIONS } from '../src/lib/initialData';
import { DEFAULT_PERMISSION_PRESETS } from '../src/lib/permissions';
import { deduplicateUsers, deduplicateDepartments, deduplicateJobTitles, deduplicateWorkflowTemplates, deduplicateDocuments, deduplicatePresets } from '../src/lib/storage';

const backupData = {
  system: "CMS Phê Duyệt Văn Bản & Trình Ký Điện Tử - Công Ty TNHH Thiết Bị Khoa Học Kỹ Thuật Trung Hải",
  company: "Công Ty TNHH Thiết Bị Khoa Học Kỹ Thuật Trung Hải (Trung Hai Science Co., Ltd)",
  version: "1.0.1",
  backupType: "FULL_DATABASE_SNAPSHOT",
  exportedAt: new Date().toISOString(),
  exportedBy: "System Administrator (admin)",
  summary: {
    totalUsers: deduplicateUsers(USERS).length,
    totalDepartments: deduplicateDepartments(INITIAL_DEPARTMENTS).length,
    totalJobTitles: deduplicateJobTitles(INITIAL_JOB_TITLES).length,
    totalPermissionPresets: deduplicatePresets(DEFAULT_PERMISSION_PRESETS).length,
    totalWorkflowTemplates: deduplicateWorkflowTemplates(WORKFLOW_TEMPLATES).length,
    totalDocuments: deduplicateDocuments(INITIAL_DOCUMENTS).length,
    totalNotifications: INITIAL_NOTIFICATIONS.length
  },
  database: {
    users: deduplicateUsers(USERS),
    departments: deduplicateDepartments(INITIAL_DEPARTMENTS),
    jobTitles: deduplicateJobTitles(INITIAL_JOB_TITLES),
    permissionPresets: deduplicatePresets(DEFAULT_PERMISSION_PRESETS),
    workflowTemplates: deduplicateWorkflowTemplates(WORKFLOW_TEMPLATES),
    documents: deduplicateDocuments(INITIAL_DOCUMENTS),
    notifications: INITIAL_NOTIFICATIONS,
    deletedUserIds: [],
    deletedDepartmentIds: [],
    deletedJobTitleIds: [],
    deletedPresetIds: [],
    deletedWorkflowTemplateIds: [],
    deletedDocumentIds: []
  },
  minioStorageConfig: {
    endpoint: "http://trunghaico.synology.me:9000",
    bucket: "crm.trunghaico.vn",
    accessKey: "sysadmin",
    autoBackupEnabled: true,
    intervalMinutes: 10,
    syncOnStartup: true,
    backupOnChange: true
  }
};

const backupDir = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const backupFilePath = path.join(backupDir, 'database_full_backup_latest.json');
fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

console.log(`✅ Backup file created successfully at: ${backupFilePath}`);
console.log(`📊 Backup Summary:`);
console.log(` - Users: ${backupData.summary.totalUsers}`);
console.log(` - Departments: ${backupData.summary.totalDepartments}`);
console.log(` - Job Titles: ${backupData.summary.totalJobTitles}`);
console.log(` - Permission Presets: ${backupData.summary.totalPermissionPresets}`);
console.log(` - Workflow Templates: ${backupData.summary.totalWorkflowTemplates}`);
console.log(` - Documents: ${backupData.summary.totalDocuments}`);
console.log(` - Notifications: ${backupData.summary.totalNotifications}`);
