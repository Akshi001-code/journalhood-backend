# Mental Health Testing Script

This script adds test journal entries to students that contain trigger words for mental health issues. It's designed to test the automatic flagging and resource delivery system.

## What it does

The script creates realistic journal entries containing keywords that trigger detection for:

### 🔴 Depression Issues
- Keywords: sad, depressed, hopeless, worthless, empty, dark, "nothing matters", "give up"
- Sample entry: "I've been feeling really sad lately. Everything seems hopeless and I don't know what to do..."

### 🟠 Bullying Issues  
- Keywords: bully, bullied, teasing, mean, "picked on", "laughed at", excluded, threatened
- Sample entry: "Some kids were bullying me again today. They called me names and made fun of my clothes..."

### 🔵 Introvert Issues
- Keywords: shy, quiet, "social anxiety", "prefer to be alone", "nervous around people", "lunch alone"
- Sample entry: "I'm very shy and quiet in class. I don't like talking to other people and it's hard to make friends..."

### 🟢 Language Problem Issues
- Keywords: "don't understand", "English is hard", "difficult words", "communication problem", "my English is bad"
- Sample entry: "I don't understand many things in class because English is hard for me..."

## How to run

### From the server directory:
```bash
cd server
npm run seed-mental-health-test
```

### Or directly with ts-node:
```bash
cd server
npx ts-node src/scripts/add-test-mental-health-entries.ts
```

## What happens

1. **Finds all students** in the database
2. **Distributes students** across the 4 issue types  
3. **Adds 5 journal entries per student** containing trigger words
4. **Spreads entries over 20 days** to simulate realistic timeline
5. **Each student gets 5+ entries** of the same issue type to trigger flagging

## Testing the system

After running this script:

1. **Go to Super Admin Dashboard** → Analytics
2. **Click "Analyze Student Mental Health"**
3. **Wait for analysis to complete**
4. **Check the results**: Should show flagged students
5. **Go to "Issue Students" tab** to see detailed flagged student data
6. **Verify resources were delivered** automatically

## Expected results

- Students should be **flagged** after 4+ detections of the same issue
- **Resources should be automatically delivered** to flagged students
- You should see the flagged students in the **"Issue Students"** tab
- Each student will have **realistic journal entries** that triggered the flags

## Cleanup

If you want to remove the test data:
```bash
npm run cleanup-database
```

**⚠️ Warning: This will remove ALL data, not just test entries**

## Notes

- Script uses **keyword matching** (not real AI) for detection
- Entries are realistic and age-appropriate for students
- Timeline is spread over 20 days to simulate natural journal writing
- Each issue type gets equal distribution of students 