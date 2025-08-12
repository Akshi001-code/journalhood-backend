import { Request, Response } from "express";
import admin from "../config/firebase.config";
import { Timestamp } from "firebase-admin/firestore";
import { tryDecryptContent, isEncrypted } from "../utils/decrypt-journal";

// ================================================================================================
// INCREMENTAL ANALYSIS SYSTEM - COMPLETE IMPLEMENTATION
// ================================================================================================

// Helper function to get last analysis state
const getLastAnalysisState = async () => {
  try {
    const stateDoc = await admin.firestore()
      .collection('analysisState')
      .doc('mentalHealthAnalysis')
      .get();
    
    if (stateDoc.exists) {
      const data = stateDoc.data();
      return {
        lastAnalysisDate: data?.lastAnalysisDate?.toDate() || null,
        totalJournalsAnalyzed: data?.totalJournalsAnalyzed || 0,
        totalStudentsAnalyzed: data?.totalStudentsAnalyzed || 0,
        analysisRunCount: data?.analysisRunCount || 0
      };
    }
    
    return {
      lastAnalysisDate: null,
      totalJournalsAnalyzed: 0,
      totalStudentsAnalyzed: 0,
      analysisRunCount: 0
    };
  } catch (error) {
    console.error('Error getting last analysis state:', error);
    return {
      lastAnalysisDate: null,
      totalJournalsAnalyzed: 0,
      totalStudentsAnalyzed: 0,
      analysisRunCount: 0
    };
  }
};

// Helper function to update analysis state
const updateAnalysisState = async (newJournalsCount: number, studentsCount: number) => {
  try {
    const stateRef = admin.firestore()
      .collection('analysisState')
      .doc('mentalHealthAnalysis');
    
    const currentState = await getLastAnalysisState();
    
    await stateRef.set({
      lastAnalysisDate: Timestamp.now(),
      totalJournalsAnalyzed: currentState.totalJournalsAnalyzed + newJournalsCount,
      totalStudentsAnalyzed: studentsCount,
      analysisRunCount: currentState.analysisRunCount + 1,
      updatedAt: Timestamp.now()
    });
    
    console.log(`📊 Analysis state updated: +${newJournalsCount} journals, ${studentsCount} students, run #${currentState.analysisRunCount + 1}`);
  } catch (error) {
    console.error('Error updating analysis state:', error);
  }
};

// Helper function to move analyzed journals to backup collection
const moveJournalsToBackup = async (journalEntries: any[]) => {
  try {
    const batch = admin.firestore().batch();
    let moveCount = 0;
    
    for (const entry of journalEntries) {
      // Add to analyzedJournals collection
      const backupRef = admin.firestore()
        .collection('analyzedJournals')
        .doc(`${entry.studentId}_${entry.id}`);
      
      batch.set(backupRef, {
        ...entry.data,
        originalId: entry.id,
        studentId: entry.studentId,
        analyzedAt: Timestamp.now(),
        moveBatch: `batch_${Date.now()}`
      });
      
      // Remove from original location
      const originalRef = admin.firestore()
        .collection('users')
        .doc(entry.studentId)
        .collection('journalEntries')
        .doc(entry.id);
      
      batch.delete(originalRef);
      moveCount++;
    }
    
    if (moveCount > 0) {
      await batch.commit();
      console.log(`📦 Moved ${moveCount} analyzed journals to backup collection`);
    }
    
    return moveCount;
  } catch (error) {
    console.error('Error moving journals to backup:', error);
    return 0;
  }
};

// Helper function to get existing flag count for incremental updates
const getExistingFlagCount = async (studentId: string, issueType: string) => {
  try {
    const flagSnapshot = await admin.firestore()
      .collection('studentFlags')
      .where('studentId', '==', studentId)
      .where('issueType', '==', issueType)
      .limit(1)
      .get();
    
    if (!flagSnapshot.empty && flagSnapshot.docs[0]) {
      const flagDoc = flagSnapshot.docs[0];
      const flagData = flagDoc.data();
      return {
        exists: true,
        flagRef: flagDoc.ref,
        currentCount: flagData.flagCount || 0,
        resourcesDelivered: flagData.resourcesDelivered || false,
        flagData: flagData
      };
    }
    
    return {
      exists: false,
      flagRef: null,
      currentCount: 0,
      resourcesDelivered: false,
      flagData: null
    };
  } catch (error) {
    console.error('Error getting existing flag count:', error);
    return {
      exists: false,
      flagRef: null,
      currentCount: 0,
      resourcesDelivered: false,
      flagData: null
    };
  }
};

// Mock analysis function (same as original)
const mockAnalyzeJournalEntry = (content: string) => {
  const lowerContent = content.toLowerCase();
  const issues: any[] = [];

  // 1. DEPRESSION: Detect signs of sadness, hopelessness, worthlessness
  if (lowerContent.includes('sad') || lowerContent.includes('depressed') || lowerContent.includes('hopeless') ||
      lowerContent.includes('worthless') || lowerContent.includes('empty') || lowerContent.includes('dark') ||
      lowerContent.includes('nothing matters') || lowerContent.includes('no point') || lowerContent.includes('give up')) {
    issues.push({
      issueType: 'depression',
      severity: 'high',
      confidence: 0.8,
      reasoning: 'Detected depressive language patterns and mood indicators',
      excerpts: [content.substring(0, 150)]
    });
  }

  // 2. BULLYING: Detect mentions of harassment, teasing, exclusion, threats
  if (lowerContent.includes('bully') || lowerContent.includes('bullied') || lowerContent.includes('teasing') ||
      lowerContent.includes('mean') || lowerContent.includes('picked on') || lowerContent.includes('laughed at') ||
      lowerContent.includes('excluded') || lowerContent.includes('threatened') || lowerContent.includes('hurt me') ||
      lowerContent.includes('made fun') || lowerContent.includes('called names') || lowerContent.includes('pushed me') ||
      lowerContent.includes('nobody likes me') || lowerContent.includes('everyone hates') || lowerContent.includes('ignored me')) {
    issues.push({
      issueType: 'bullying',
      severity: 'high',
      confidence: 0.85,
      reasoning: 'Detected potential bullying experiences or social harassment',
      excerpts: [content.substring(0, 150)]
    });
  }

  // 3. LANGUAGE PROBLEM: Detect language struggles, comprehension issues
  if (lowerContent.includes('don\'t understand') || lowerContent.includes('hard to read') || 
      lowerContent.includes('can\'t speak') || lowerContent.includes('language problem') ||
      lowerContent.includes('english is hard') || lowerContent.includes('difficult words') ||
      lowerContent.includes('can\'t express') || lowerContent.includes('communication problem') ||
      lowerContent.includes('translation') || lowerContent.includes('my english is bad') ||
      lowerContent.includes('struggle with words') || lowerContent.includes('confused in class')) {
    issues.push({
      issueType: 'language_problem',
      severity: 'medium',
      confidence: 0.7,
      reasoning: 'Detected indicators of English language difficulties or comprehension struggles',
      excerpts: [content.substring(0, 150)]
    });
  }

  // 4. INTROVERT: Detect signs of social anxiety, shyness, difficulty with social interaction
  if (lowerContent.includes('shy') || lowerContent.includes('quiet') || lowerContent.includes('don\'t like talking') ||
      lowerContent.includes('hard to make friends') || lowerContent.includes('prefer to be alone') ||
      lowerContent.includes('social anxiety') || lowerContent.includes('nervous around people') ||
      lowerContent.includes('don\'t speak up') || lowerContent.includes('keep to myself') ||
      lowerContent.includes('afraid to talk') || lowerContent.includes('feel awkward') ||
      lowerContent.includes('don\'t join') || lowerContent.includes('stay in the background') ||
      lowerContent.includes('uncomfortable in groups') || lowerContent.includes('rather read than play') ||
      lowerContent.includes('lunch alone') || lowerContent.includes('sit by myself')) {
    issues.push({
      issueType: 'introvert',
      severity: 'medium',
      confidence: 0.75,
      reasoning: 'Detected indicators of introverted behavior and social discomfort',
      excerpts: [content.substring(0, 150)]
    });
  }

  // Determine overall risk based on detected issues
  let riskLevel = 'low';
  if (issues.some(i => i.issueType === 'bullying' || i.issueType === 'depression')) {
    riskLevel = 'high';
  } else if (issues.length > 0) {
    riskLevel = 'medium';
  }

  return {
    issues,
    overallAssessment: {
      riskLevel,
      requiresAttention: issues.length > 0,
      summary: `Detected ${issues.length} specific concern(s): ${issues.map(i => i.issueType).join(', ')}`
    }
  };
};

// Resource delivery function (simplified - import from original if needed)
const deliverResourcesAutomatically = async (studentId: string, issueType: string, studentData: any) => {
  try {
    console.log(`🎯 Delivering resources for ${issueType} to ${studentData.displayName}`);
    
    // Get top 5 resources for this issue type
    const resourcesSnapshot = await admin.firestore()
      .collection('resources')
      .where('category', '==', issueType)
      .where('status', '==', 'active')
      .limit(5)
      .get();

    if (resourcesSnapshot.empty) {
      console.log(`⚠️ No resources available for ${issueType}`);
      return [];
    }

    const deliveredResources: any[] = [];
    const batch = admin.firestore().batch();

    // Create delivered resource records
    resourcesSnapshot.docs.forEach((resourceDoc) => {
      const resourceData = resourceDoc.data();
      const deliveredResourceRef = admin.firestore()
        .collection('users')
        .doc(studentId)
        .collection('deliveredResources')
        .doc(resourceDoc.id);

      batch.set(deliveredResourceRef, {
        resourceId: resourceDoc.id,
        title: resourceData.title,
        description: resourceData.description,
        url: resourceData.url,
        category: resourceData.category,
        issueType: issueType,
        deliveredAt: Timestamp.now(),
        deliveredReason: `Flagged for ${issueType} (mental health analysis)`,
        viewedAt: null,
        studentId: studentId
      });

      deliveredResources.push({
        resourceId: resourceDoc.id,
        title: resourceData.title,
        category: resourceData.category
      });
    });

    await batch.commit();
    console.log(`✅ Delivered ${deliveredResources.length} resources for ${issueType}`);
    return deliveredResources;

  } catch (error) {
    console.error('Error delivering resources:', error);
    return [];
  }
};

// ================================================================================================
// MAIN INCREMENTAL ANALYSIS FUNCTION
// ================================================================================================

export const analyzeAllStudentJournalsIncremental = async (req: Request, res: Response) => {
  try {
    console.log('🧠 Starting incremental mental health analysis...');
    
    const { uid: adminId } = req.user!;
    
    // Verify this is a super admin
    const adminUser = await admin.auth().getUser(adminId);
    const adminClaims = adminUser.customClaims as any;
    
    if (adminClaims?.role !== 'super-admin') {
      return res.status(403).json({
        error: "Access denied",
        details: "Only super admins can run comprehensive analysis"
      });
    }

    // Get last analysis state for incremental processing
    const analysisState = await getLastAnalysisState();
    const lastAnalysisDate = analysisState.lastAnalysisDate;
    const analysisMethod = req.body.analysisMethod || 'keyword';
    
    console.log(`📊 Analysis state: Last run ${lastAnalysisDate ? lastAnalysisDate.toISOString() : 'NEVER'}, Total journals analyzed: ${analysisState.totalJournalsAnalyzed}`);

    // Get all students from all districts
    const usersRef = admin.firestore().collection('users');
    const studentsSnapshot = await usersRef
      .where('role', '==', 'student')
      .get();

    if (studentsSnapshot.empty) {
      return res.status(200).json({
        success: true,
        data: { analyzedStudents: 0, flaggedStudents: 0, resourcesDelivered: 0, newJournalsProcessed: 0 },
        message: 'No students found to analyze'
      });
    }

    let analyzedCount = 0;
    let flaggedCount = 0;
    let resourcesDeliveredCount = 0;
    let newJournalsCount = 0;
    const flaggedStudents: any[] = [];
    const processedJournals: any[] = [];

    // Process each student
    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;
      
      if (!studentData.displayName || !studentData.email) {
        console.log(`⚠️ Skipping student with incomplete data: ${studentId}`);
        continue;
      }

      console.log(`👤 Analyzing student: ${studentData.displayName} (${studentId})`);

      try {
        // Get student's NEW journal entries since last analysis (or all if first run)
        const journalEntriesRef = admin.firestore()
          .collection('users')
          .doc(studentId)
          .collection('journalEntries');
        
        let journalQuery = journalEntriesRef.orderBy('timestamp', 'desc');
        
        // Only get journals created after last analysis (incremental processing)
        if (lastAnalysisDate) {
          journalQuery = journalQuery.where('timestamp', '>', Timestamp.fromDate(lastAnalysisDate));
          console.log(`🔍 Looking for journals after ${lastAnalysisDate.toISOString()} for ${studentData.displayName}`);
        } else {
          // First run - get all journals from last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          journalQuery = journalQuery.where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo));
          console.log(`🔍 First analysis - getting last 30 days for ${studentData.displayName}`);
        }
        
        const journalSnapshot = await journalQuery.get();

        if (journalSnapshot.empty) {
          console.log(`⚠️ No new journal entries for ${studentData.displayName}`);
          continue;
        }

        console.log(`📝 Found ${journalSnapshot.size} new journal entries for ${studentData.displayName}`);

        // Track NEW issue counts for this student (will be added to existing counts)
        const newIssueCountMap: Map<string, number> = new Map();
        const issueExcerpts: Map<string, string[]> = new Map();

        // Analyze each journal entry
        for (const entryDoc of journalSnapshot.docs) {
          const entryData = entryDoc.data();
          let content = entryData.content;

          // Handle different content formats
          if (Array.isArray(content)) {
            content = content
              .map((op: any) => op.insert || '')
              .join('')
              .trim();
          } else if (typeof content === 'string') {
            // Check if content is encrypted and try to decrypt it
            if (isEncrypted(content)) {
              try {
                const decryptedContent = tryDecryptContent(content, studentId);
                // Parse the decrypted JSON content
                const parsedContent = JSON.parse(decryptedContent);
                if (Array.isArray(parsedContent)) {
                  content = parsedContent
                    .map((item: any) => item.insert || '')
                    .join(' ');
                } else {
                  content = decryptedContent;
                }
                console.log(`🔓 Successfully decrypted entry for student ${studentId}`);
              } catch (decryptError) {
                console.error(`❌ Failed to decrypt entry for student ${studentId}:`, decryptError);
                content = content.trim(); // Fallback to original content
              }
            } else {
              content = content.trim();
            }
          } else {
            continue;
          }

          if (!content || content.length < 10) {
            continue;
          }

          // Analysis using selected method
          const aiResult = analysisMethod === 'openai' 
            ? mockAnalyzeJournalEntry(content) // Replace with: await openaiAnalyzeJournalEntry(content)
            : mockAnalyzeJournalEntry(content);

          // Process identified issues
          if (aiResult.issues && Array.isArray(aiResult.issues)) {
            for (const issue of aiResult.issues) {
              const issueType = issue.issueType;
              const currentCount = newIssueCountMap.get(issueType) || 0;
              newIssueCountMap.set(issueType, currentCount + 1);

              // Store excerpts
              if (!issueExcerpts.has(issueType)) {
                issueExcerpts.set(issueType, []);
              }
              const excerpts = issueExcerpts.get(issueType)!;
              if (excerpts.length < 3) {
                excerpts.push(content.substring(0, 150));
              }
            }
          }
          
          // Add processed journal to backup list
          processedJournals.push({
            id: entryDoc.id,
            studentId: studentId,
            data: entryData
          });
          newJournalsCount++;
        }

        analyzedCount++;

        // INCREMENTAL FLAG UPDATE: Add new counts to existing flag counts
        for (const [issueType, newCount] of newIssueCountMap.entries()) {
          const existingFlag = await getExistingFlagCount(studentId, issueType);
          const totalCount = existingFlag.currentCount + newCount;
          
          console.log(`🔢 ${studentData.displayName} - ${issueType}: existing ${existingFlag.currentCount} + new ${newCount} = total ${totalCount}`);
          
          // Check if total count reaches flagging threshold (4 or more occurrences)
          if (totalCount >= 4) {
            console.log(`🚩 FLAGGED: ${studentData.displayName} for ${issueType} (${totalCount} total occurrences)`);
            
            let shouldDeliverResources = true;
            let flagRef: admin.firestore.DocumentReference;

            if (existingFlag.exists && existingFlag.flagRef) {
              // Update existing flag
              flagRef = existingFlag.flagRef;
              await flagRef.update({
                flagCount: totalCount,
                dateLastFlagged: new Date().toISOString().split('T')[0],
                lastUpdated: Timestamp.now(),
                excerpts: admin.firestore.FieldValue.arrayUnion(...(issueExcerpts.get(issueType) || []))
              });

              // Only deliver resources if not already delivered
              shouldDeliverResources = !existingFlag.resourcesDelivered;
            } else {
              // Create new flag
              const flagId = `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              flagRef = admin.firestore().collection('studentFlags').doc(flagId);
              
              await flagRef.set({
                id: flagId,
                studentId: studentId,
                studentName: studentData.displayName || 'Unknown',
                studentEmail: studentData.email || 'unknown@example.com',
                issueType: issueType,
                flagCount: totalCount,
                resourcesDelivered: false,
                dateFirstFlagged: new Date().toISOString().split('T')[0],
                dateLastFlagged: new Date().toISOString().split('T')[0],
                schoolId: studentData.schoolId || 'unknown',
                districtId: studentData.districtId || 'unknown',
                createdAt: Timestamp.now(),
                lastUpdated: Timestamp.now(),
                excerpts: issueExcerpts.get(issueType) || []
              });
            }

            // Deliver resources automatically
            if (shouldDeliverResources) {
              try {
                const deliveredResources = await deliverResourcesAutomatically(studentId, issueType, studentData);
                
                if (deliveredResources && deliveredResources.length > 0) {
                  // Update flag to mark resources as delivered
                  await flagRef.update({
                    resourcesDelivered: true,
                    resourcesDeliveredAt: Timestamp.now(),
                    deliveredResourcesCount: deliveredResources.length
                  });
                  
                  resourcesDeliveredCount += deliveredResources.length;
                  console.log(`✅ Resources delivered to ${studentData.displayName} for ${issueType}`);
                }
              } catch (deliveryError) {
                console.error('❌ Failed to deliver resources:', deliveryError);
              }
            }

            flaggedCount++;
            flaggedStudents.push({
              studentId,
              studentName: studentData.displayName,
              issueType,
              flagCount: totalCount,
              resourcesDelivered: shouldDeliverResources
            });
          }
        }

      } catch (studentError) {
        console.error(`❌ Error analyzing student ${studentId}:`, studentError);
        continue;
      }
    }

    // Move processed journals to backup and update analysis state
    const movedJournalsCount = await moveJournalsToBackup(processedJournals);
    await updateAnalysisState(newJournalsCount, analyzedCount);

    console.log(`✅ Incremental analysis complete: ${newJournalsCount} NEW journals analyzed, ${analyzedCount} students processed, ${flaggedCount} flags created/updated, ${resourcesDeliveredCount} resources delivered, ${movedJournalsCount} journals moved to backup`);

    return res.status(200).json({
      success: true,
      data: {
        analyzedStudents: analyzedCount,
        flaggedStudents: flaggedCount,
        resourcesDelivered: resourcesDeliveredCount,
        newJournalsProcessed: newJournalsCount,
        journalsMovedToBackup: movedJournalsCount,
        isIncremental: lastAnalysisDate !== null,
        lastAnalysisDate: lastAnalysisDate?.toISOString() || null,
        flaggedStudentsList: flaggedStudents
      },
      message: `Incremental mental health analysis completed successfully`
    });

  } catch (error) {
    console.error('❌ Error in incremental mental health analysis:', error);
    return res.status(500).json({
      error: "Analysis failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}; 