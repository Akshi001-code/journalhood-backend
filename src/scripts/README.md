# Database Scripts

This directory contains scripts for managing and seeding the JournalHood database.

## Available Scripts

### Database Cleanup

**Script**: `cleanup-all-data.ts`

This script removes ALL users and user data from the database while preserving the super admin account.

#### What it removes:

- **All Firebase Auth users** (except super admin)
- **All Firestore collections**:
  - `users` - User profile data
  - `districts` - District information
  - `schools` - School information
  - `classes` - Class information
  - `analyzedData` - Analytics data
  - `diaryEntriesBackup` - All diary entries and subcollections

#### What it preserves:

- **Super Admin Account** - Identified by role `super-admin`
- **Firebase project settings** - Only data is removed, not configuration

#### Safety Features:

- **Super Admin Detection** - Finds super admin by email or role before proceeding
- **Confirmation Prompt** - 5-second delay in development mode
- **Batch Processing** - Handles large datasets efficiently
- **Error Handling** - Continues cleanup even if some operations fail
- **Progress Tracking** - Detailed logging and final summary

#### How to Run:

**Option 1: Using Makefile (Recommended)**
```bash
make cleanup-database
```

**Option 2: Using npm directly**
```bash
cd server
npm run cleanup-database
```

**Option 3: Using ts-node directly**
```bash
cd server
npx ts-node src/scripts/cleanup-all-data.ts
```

#### Prerequisites:

1. Firebase Admin SDK properly configured
2. Super admin account must exist in Firebase Auth
3. Environment variables configured (ADMIN_EMAIL optional)

#### ⚠️ **CRITICAL WARNINGS**:

- **IRREVERSIBLE**: This operation cannot be undone
- **PRODUCTION**: Use extreme caution in production environments
- **BACKUP**: Always backup your data before running
- **TESTING**: Test thoroughly in development environment first

### Structured Data Seeding

**Script**: `seed-structured-data.ts`

This script creates a clean, structured dataset with recognizable naming patterns for easy testing and development.

#### What it creates:

- **2 Districts** (dis1, dis2)
- **4 Schools** (dis1school1, dis1school2, dis2school1, dis2school2)
- **16 Classes** (dis1school1class1, dis1school1class2, etc.)
- **16 Teachers** (dis1school1teacher1, dis1school1teacher2, etc.)
- **160 Students** (dis1school1teacher1student1, dis1school1teacher1student2, etc.)

#### Naming Convention:

- **District Admins**: `dis1@journalhood.com`, `dis2@journalhood.com`
- **School Admins**: `dis1school1@journalhood.com`, `dis1school2@journalhood.com`
- **Teachers**: `dis1school1teacher1@journalhood.com`, `dis1school1teacher2@journalhood.com`
- **Students**: `dis1school1teacher1student1@journalhood.com`, `dis1school1teacher1student2@journalhood.com`

#### Structure:

```
dis1 (District 1)
├── dis1school1 (4 teachers, 40 students)
│   ├── dis1school1teacher1 (10 students)
│   ├── dis1school1teacher2 (10 students)
│   ├── dis1school1teacher3 (10 students)
│   └── dis1school1teacher4 (10 students)
└── dis1school2 (4 teachers, 40 students)
    ├── dis1school2teacher1 (10 students)
    ├── dis1school2teacher2 (10 students)
    ├── dis1school2teacher3 (10 students)
    └── dis1school2teacher4 (10 students)

dis2 (District 2)
├── dis2school1 (4 teachers, 40 students)
└── dis2school2 (4 teachers, 40 students)
```

#### How to Run:

**Using npm:**
```bash
cd server
npm run seed-structured
```

**Using ts-node directly:**
```bash
cd server
npx ts-node src/scripts/seed-structured-data.ts
```

#### Features:

- **Predictable Names**: Easy to remember and test with
- **Consistent Structure**: Each level follows the same pattern
- **Complete Hierarchy**: Full relationships between all entities
- **Test-Friendly**: Perfect for development and testing scenarios

#### Default Password:

All users are created with the password: `password123`

### Comprehensive Data Seeding

**Script**: `seed-comprehensive-data.ts`

This script populates the database with a realistic dataset for testing and development.

#### What it creates:

- **4 Districts** across different countries
- **10 Schools** (8 assigned to districts, 2 unassigned for super admin testing)
- **4 District Admins** (one per district)
- **6 School Admins** (one per school)
- **24 Classes** (Kindergarten, Grade 1, Grade 2 with A/B divisions)
- **24 Teachers** (one per class)
- **192 Students** (8 per class)
- **2,304 Journal Entries** (12 per student with realistic content)

#### Sample Users Created:

| Role | Email | Password |
|------|--------|----------|
| District Admin | district.admin1@journalhood.com | password123 |
| School Admin | school.admin1@journalhood.com | password123 |
| Teacher | teacher1@journalhood.com | password123 |
| Student | student1@journalhood.com | password123 |

*All users follow this pattern with incrementing numbers*

#### How to Run:

**Option 1: Using Makefile (Recommended)**
```bash
make seed-database
```

**Option 2: Using npm directly**
```bash
cd server
npm run seed-data
```

**Option 3: Using ts-node directly**
```bash
cd server
npx ts-node src/scripts/seed-comprehensive-data.ts
```

#### Prerequisites:

1. Firebase Admin SDK properly configured
2. Firebase project setup with Firestore
3. Environment variables configured in `.env`

#### Data Structure:

The script creates data in the following order to maintain relationships:
1. Districts → Schools → Classes → Teachers/Students → Journal Entries
2. Proper custom claims are set for all users
3. Cross-references are maintained (school counts, student counts, etc.)

#### Features:

- **Realistic Content**: Journal entries use age-appropriate prompts and responses
- **Proper Relationships**: All users have correct district/school/class assignments
- **Varied Data**: Different word counts, moods, and entry dates
- **Unassigned Schools**: Some schools left unassigned for super admin functionality testing
- **Complete Analytics Data**: Generates data suitable for all analytics endpoints

#### Cleanup:

To remove all seeded data, you would need to:
1. Delete all users from Firebase Auth
2. Clear Firestore collections: `districts`, `schools`, `classes`, `diaryEntries`

**⚠️ Warning**: This script creates real users and data. Use only in development/testing environments. 