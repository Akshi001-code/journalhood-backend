import { Request, Response } from "express";
import admin from "../config/firebase.config";
import { Timestamp } from "firebase-admin/firestore";
import { tryDecryptContent, isEncrypted } from "../utils/decrypt-journal";
// import OpenAI from 'openai'; // Uncomment to use OpenAI instead of keyword matching

// ================================================================================================
// INCREMENTAL ANALYSIS SYSTEM
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
        .doc(entry.id);
      
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
    
    if (!flagSnapshot.empty) {
      const flagData = flagSnapshot.docs[0].data();
      return {
        exists: true,
        flagRef: flagSnapshot.docs[0].ref,
        currentCount: flagData.flagCount || 0,
        resourcesDelivered: flagData.resourcesDelivered || false
      };
    }
    
    return {
      exists: false,
      flagRef: null,
      currentCount: 0,
      resourcesDelivered: false
    };
  } catch (error) {
    console.error('Error getting existing flag count:', error);
    return {
      exists: false,
      flagRef: null,
      currentCount: 0,
      resourcesDelivered: false
    };
  }
};

// ================================================================================================
// MENTAL HEALTH ANALYSIS CONFIGURATION
// ================================================================================================
// This system supports two analysis methods:
// 
// 1. KEYWORD MATCHING (Default - Currently Active)
//    - Fast and reliable, uses predefined keywords to detect mental health issues
//    - No API costs, currently detecting: depression, bullying, introvert, language_problem
// 
// 2. OPENAI INTEGRATION (Optional - Currently Disabled)  
//    - More sophisticated analysis using GPT models
//    - Better context understanding and nuanced detection
//    - Requires OpenAI API key and costs per request
//
// TO ENABLE OPENAI INTEGRATION:
// Step 1: Add OPENAI_API_KEY=your_key_here to your .env file
// Step 2: Uncomment: import OpenAI from 'openai'; (line 3)
// Step 3: Uncomment the openaiAnalyzeJournalEntry function (lines ~155-240)
// Step 4: Replace mockAnalyzeJournalEntry with await openaiAnalyzeJournalEntry in analysis calls
// Step 5: Set USE_OPENAI_ANALYSIS = true (below)
// Step 6: Test the integration
// ================================================================================================

// Analysis method will be passed as parameter from frontend
// No hardcoded configuration - user chooses method when running analysis

// Interface definitions
interface MentalHealthIssue {
  id: string;
  studentId: string;
  studentName: string;
  issueType: 'bullying' | 'depression' | 'language_problem' | 'introvert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  firstDetected: string;
  lastDetected: string;
  isFlagged: boolean;
  journalExcerpts: string[];
  confidence: number;
}

interface StudentFlag {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  issueType: 'bullying' | 'depression' | 'language_problem' | 'introvert';
  flagCount: number;
  resourcesDelivered: boolean;
  dateFirstFlagged: string;
  dateLastFlagged: string;
  schoolId: string;
  districtId: string;
}

interface StudentMentalHealthProfile {
  studentId: string;
  studentName: string;
  email: string;
  totalIssues: number;
  flaggedIssues: number;
  lastAnalyzed: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  issues: MentalHealthIssue[];
}

// Helper function to calculate overall risk
const calculateOverallRisk = (issues: MentalHealthIssue[]): 'low' | 'medium' | 'high' | 'critical' => {
  if (issues.length === 0) return 'low';
  
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  
  if (criticalIssues.length > 0) return 'critical';
  if (highIssues.length >= 2) return 'critical';
  if (highIssues.length >= 1) return 'high';
  if (mediumIssues.length >= 3) return 'high';
  if (mediumIssues.length >= 1) return 'medium';
  
  return 'low';
};

// Helper function to generate unique ID
const generateId = (): string => {
  return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Mock analysis function (replace with OpenAI when available)
const mockAnalyzeJournalEntry = (content: string) => {
  const lowerContent = content.toLowerCase();
  const issues: any[] = [];

  // Detection for the 3 specific issues

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
      lowerContent.includes('struggle with words') || lowerContent.includes('confused in class') ||
      // Also detect potential indicators through grammar/spelling patterns
      (content.split(' ').length > 10 && (
        lowerContent.includes(' me no ') || lowerContent.includes(' i no ') ||
        (lowerContent.match(/\b(is|are|am)\b/g) || []).length < content.split('.').length * 0.3
      ))) {
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

// OpenAI analysis function (uncomment and configure when needed)
/*
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to add this to your .env file
});

const openaiAnalyzeJournalEntry = async (content: string) => {
  try {
    const prompt = `Analyze the following student journal entry for mental health concerns. Identify any signs of:

1. DEPRESSION: Sadness, hopelessness, worthlessness, suicidal thoughts, loss of interest
2. BULLYING: Being harassed, teased, excluded, threatened, or made fun of by others
3. INTROVERT: Social anxiety, shyness, difficulty with social interaction, preference for isolation
4. LANGUAGE_PROBLEM: Difficulty with English, comprehension issues, communication struggles

For each issue detected, provide:
- Issue type (depression, bullying, introvert, language_problem)
- Severity (low, medium, high, critical)
- Confidence (0.0 to 1.0)
- Brief reasoning
- Relevant excerpt from the text

Journal entry: "${content}"

Respond in JSON format:
{
  "issues": [
    {
      "issueType": "depression",
      "severity": "high",
      "confidence": 0.85,
      "reasoning": "Student expresses feelings of hopelessness and sadness",
      "excerpts": ["relevant excerpt here"]
    }
  ],
  "overallAssessment": {
    "riskLevel": "high",
    "requiresAttention": true,
    "summary": "Brief summary of concerns"
  }
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo" for lower cost
      messages: [
        {
          role: "system",
          content: "You are a mental health assessment AI designed to help identify student concerns from journal entries. Be sensitive and accurate in your analysis. Only flag genuine concerns."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 1000,
    });

    const result = response.choices[0].message.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const analysis = JSON.parse(result);
    
    // Validate the response structure
    if (!analysis.issues || !Array.isArray(analysis.issues)) {
      throw new Error('Invalid response format from OpenAI');
    }

    return analysis;

  } catch (error) {
    console.error('❌ OpenAI analysis error:', error);
    
    // Fallback to mock analysis if OpenAI fails
    console.log('⚠️ Falling back to keyword-based analysis');
    return mockAnalyzeJournalEntry(content);
  }
};
*/

// Function to automatically deliver resources when a student is flagged
const deliverResourcesAutomatically = async (studentId: string, issueType: string, studentData: any) => {
  try {
    console.log(`📚 Auto-delivering resources for ${issueType} to student ${studentId}`);
    
    // Get resources for this issue category
    const resourcesRef = admin.firestore().collection('resources');
    const resourcesSnapshot = await resourcesRef
      .where('category', '==', issueType)
      .where('status', '==', 'active')
      .limit(5) // Deliver top 5 resources
      .get();

    if (resourcesSnapshot.empty) {
      console.log('⚠️ No resources found for issue type:', issueType);
      return;
    }

    // Create delivery records
    const deliveryBatch = admin.firestore().batch();
    const deliveredResources: any[] = [];

    resourcesSnapshot.docs.forEach((resourceDoc) => {
      const resourceData = resourceDoc.data();
      const deliveryId = `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create resource delivery record
      const deliveryRef = admin.firestore()
        .collection('users')
        .doc(studentId)
        .collection('deliveredResources')
        .doc(deliveryId);

      deliveryBatch.set(deliveryRef, {
        resourceId: resourceDoc.id,
        resourceTitle: resourceData.title,
        resourceUrl: resourceData.url,
        resourceDescription: resourceData.description,
        issueType: issueType,
        deliveredAt: Timestamp.now(),
        deliveredBy: 'system',
        deliveryReason: `Automatic delivery due to ${issueType} flags`,
        isRead: false,
        isUseful: null
      });

      deliveredResources.push({
        id: resourceDoc.id,
        title: resourceData.title,
        url: resourceData.url
      });
    });

    await deliveryBatch.commit();
    
    console.log(`✅ Successfully delivered ${deliveredResources.length} resources for ${issueType}`);
    return deliveredResources;

  } catch (error) {
    console.error('❌ Error delivering resources:', error);
    throw error;
  }
};

// Enhanced analysis function for super admin
export const analyzeAllStudentJournals = async (req: Request, res: Response) => {
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
            // Quill delta format - extract text from insert operations
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
            // Skip entries with invalid content
            continue;
          }

          if (!content || content.length < 10) {
            continue;
          }

          // Analysis using either OpenAI or keyword matching based on request parameter
          // Note: To use OpenAI, uncomment the OpenAI function above and pass 'openai' as analysisMethod
          const analysisMethod = req.body.analysisMethod || 'keyword'; // Default to keyword matching
          const aiResult = analysisMethod === 'openai' 
            ? mockAnalyzeJournalEntry(content) // Replace this with: await openaiAnalyzeJournalEntry(content)
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
              if (excerpts.length < 3) { // Keep max 3 excerpts per issue
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
            
            // Check if already flagged recently
            const existingFlagsRef = admin.firestore()
              .collection('studentFlags')
              .where('studentId', '==', studentId)
              .where('issueType', '==', issueType);
            
            const existingFlagsSnapshot = await existingFlagsRef.get();
            let shouldDeliverResources = true;
            let flagRef: admin.firestore.DocumentReference | null = null;

            if (!existingFlagsSnapshot.empty) {
              // Update existing flag
              const existingFlag = existingFlagsSnapshot.docs[0];
              const existingFlagData = existingFlag.data();
              
              if (existingFlag && existingFlagData) {
                flagRef = existingFlag.ref;
                await flagRef.update({
                  flagCount: count,
                  dateLastFlagged: new Date().toISOString().split('T')[0],
                  lastUpdated: Timestamp.now()
                });

                // Only deliver resources if not already delivered
                shouldDeliverResources = !existingFlagData.resourcesDelivered;
              }
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
                flagCount: count,
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
              flagCount: count,
              resourcesDelivered: shouldDeliverResources
            });
          }
        }

      } catch (studentError) {
        console.error(`❌ Error analyzing student ${studentId}:`, studentError);
        continue;
      }
    }

    console.log(`✅ Analysis complete: ${analyzedCount} students analyzed, ${flaggedCount} flags created, ${resourcesDeliveredCount} resources delivered`);

    return res.status(200).json({
      success: true,
      data: {
        analyzedStudents: analyzedCount,
        flaggedStudents: flaggedCount,
        resourcesDelivered: resourcesDeliveredCount,
        flaggedStudentsList: flaggedStudents
      },
      message: `Mental health analysis completed successfully`
    });

  } catch (error) {
    console.error('❌ Error in comprehensive mental health analysis:', error);
    return res.status(500).json({
      error: "Analysis failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

// Get flagged students report
export const getFlaggedStudentsReport = async (req: Request, res: Response) => {
  try {
    const { uid: adminId } = req.user!;
    
    // Verify this is a super admin
    const adminUser = await admin.auth().getUser(adminId);
    const adminClaims = adminUser.customClaims as any;
    
    if (adminClaims?.role !== 'super-admin') {
      return res.status(403).json({
        error: "Access denied",
        details: "Only super admins can access flagged students report"
      });
    }

    // Get all flagged students
    const flagsSnapshot = await admin.firestore()
      .collection('studentFlags')
      .orderBy('dateLastFlagged', 'desc')
      .get();

    const flaggedStudents = flagsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateFirstFlagged: doc.data().dateFirstFlagged,
      dateLastFlagged: doc.data().dateLastFlagged
    }));

    // Group by issue type for summary
    const summaryByIssue = flaggedStudents.reduce((acc: any, flag: any) => {
      const issueType = flag.issueType;
      if (!acc[issueType]) {
        acc[issueType] = {
          totalFlags: 0,
          studentsAffected: new Set(),
          resourcesDelivered: 0
        };
      }
      acc[issueType].totalFlags++;
      acc[issueType].studentsAffected.add(flag.studentId);
      if (flag.resourcesDelivered) {
        acc[issueType].resourcesDelivered++;
      }
      return acc;
    }, {});

    // Convert Sets to counts
    Object.keys(summaryByIssue).forEach(issueType => {
      summaryByIssue[issueType].studentsAffected = summaryByIssue[issueType].studentsAffected.size;
    });

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      data: {
        flaggedStudents,
        summary: summaryByIssue,
        totalFlagged: flaggedStudents.length
      }
    });

  } catch (error) {
    console.error('❌ Error getting flagged students report:', error);
    return res.status(500).json({
      error: "Failed to get report",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const analyzeMentalHealth = async (req: Request, res: Response) => {
  try {
    console.log('🧠 Starting mental health analysis...');
    
    const { uid: teacherId } = req.user!;
    
    // Get teacher's data to find their class
    const teacherData = await admin.auth().getUser(teacherId);
    
    if (!teacherData.customClaims) {
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "Teacher has no custom claims"
      });
    }

    const teacherClaims = teacherData.customClaims as any;
    let classId: string;

    // Handle different teacher claim formats
    if (teacherClaims.classId) {
      classId = teacherClaims.classId;
    } else if (teacherClaims.gradeId && teacherClaims.division) {
      classId = `${teacherClaims.gradeId}_${teacherClaims.division}`;
    } else {
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "Cannot determine class information"
      });
    }

    console.log(`📚 Analyzing class: ${classId}`);

    // Get all students in the teacher's class
    const usersRef = admin.firestore().collection('users');
    const studentsSnapshot = await usersRef
      .where('role', '==', 'student')
      .where('classId', '==', classId)
      .get();

    if (studentsSnapshot.empty) {
      console.log('⚠️ No students found in class');
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No students found in class'
      });
    }

    const studentProfiles: StudentMentalHealthProfile[] = [];

    // Process each student
    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      const studentId = studentDoc.id;
      
      console.log(`👤 Processing student: ${studentData.displayName} (${studentId})`);

      // Get student's journal entries
      const journalEntriesRef = admin.firestore()
        .collection('users')
        .doc(studentId)
        .collection('journalEntries');
      
      const journalSnapshot = await journalEntriesRef
        .orderBy('timestamp', 'desc')
        .limit(20) // Analyze last 20 entries
        .get();

      if (journalSnapshot.empty) {
        console.log(`⚠️ No journal entries found for ${studentData.displayName}`);
        continue;
      }

      // Analyze each journal entry
      const allIssues: MentalHealthIssue[] = [];
      const issueCountMap: Map<string, number> = new Map();

      for (const entryDoc of journalSnapshot.docs) {
        const entryData = entryDoc.data();
        const content = entryData.content;

        if (!content || content.trim().length < 10) {
          console.log('⚠️ Skipping short or empty journal entry');
          continue;
        }

        try {
          console.log(`🤖 Analyzing journal entry...`);
          
          // Analysis using either OpenAI or keyword matching based on request parameter
          // Note: To use OpenAI, uncomment the OpenAI function above and pass 'openai' as analysisMethod
          const analysisMethod = req.body.analysisMethod || 'keyword'; // Default to keyword matching
          const aiResult = analysisMethod === 'openai' 
            ? mockAnalyzeJournalEntry(content) // Replace this with: await openaiAnalyzeJournalEntry(content)
            : mockAnalyzeJournalEntry(content);

          // Process identified issues
          if (aiResult.issues && Array.isArray(aiResult.issues)) {
            for (const issue of aiResult.issues) {
              const issueType = issue.issueType as MentalHealthIssue['issueType'];
              const currentCount = issueCountMap.get(issueType) || 0;
              issueCountMap.set(issueType, currentCount + 1);

              const mentalHealthIssue: MentalHealthIssue = {
                id: generateId(),
                studentId,
                studentName: studentData.displayName || 'Unknown',
                issueType: issueType,
                severity: issue.severity as MentalHealthIssue['severity'],
                count: currentCount + 1,
                firstDetected: allIssues.length === 0 ? new Date().toISOString().split('T')[0] : allIssues[0].firstDetected,
                lastDetected: new Date().toISOString().split('T')[0],
                isFlagged: currentCount + 1 >= 4, // Flag if appears 4+ times
                journalExcerpts: issue.excerpts || [],
                confidence: issue.confidence || 0.5
              };

              allIssues.push(mentalHealthIssue);
            }
          }

        } catch (analysisError) {
          console.error('❌ Analysis error:', analysisError);
          // Continue with next entry instead of failing completely
          continue;
        }
      }

      // Group issues by type and update counts
      const groupedIssues: Map<string, MentalHealthIssue> = new Map();
      
      for (const issue of allIssues) {
        const key = issue.issueType;
        if (groupedIssues.has(key)) {
          const existing = groupedIssues.get(key)!;
          existing.count = issueCountMap.get(key) || 1;
          existing.isFlagged = existing.count >= 4;
          existing.lastDetected = issue.lastDetected;
          existing.journalExcerpts = [...existing.journalExcerpts, ...issue.journalExcerpts];
          // Keep highest confidence
          if (issue.confidence > existing.confidence) {
            existing.confidence = issue.confidence;
          }
        } else {
          issue.count = issueCountMap.get(key) || 1;
          issue.isFlagged = issue.count >= 4;
          groupedIssues.set(key, issue);
        }
      }

      const finalIssues = Array.from(groupedIssues.values());

      // Store analysis results in Firestore
      const analysisData = {
        studentId,
        studentName: studentData.displayName || 'Unknown',
        email: studentData.email || '',
        totalIssues: finalIssues.length,
        flaggedIssues: finalIssues.filter(i => i.isFlagged).length,
        lastAnalyzed: new Date().toISOString().split('T')[0],
        overallRisk: calculateOverallRisk(finalIssues),
        issues: finalIssues,
        analyzedAt: Timestamp.now(),
        analyzedBy: teacherId,
        classId: classId
      };

      // Save to Firestore
      await admin.firestore()
        .collection('mental_health_analysis')
        .doc(studentId)
        .set(analysisData);

      console.log(`✅ Analysis complete for ${studentData.displayName}: ${finalIssues.length} issues, ${finalIssues.filter(i => i.isFlagged).length} flagged`);

      // Create profile for response
      const studentProfile: StudentMentalHealthProfile = {
        studentId,
        studentName: studentData.displayName || 'Unknown',
        email: studentData.email || '',
        totalIssues: finalIssues.length,
        flaggedIssues: finalIssues.filter(i => i.isFlagged).length,
        lastAnalyzed: new Date().toISOString().split('T')[0],
        overallRisk: calculateOverallRisk(finalIssues),
        issues: finalIssues
      };

      studentProfiles.push(studentProfile);
    }

    console.log(`🎯 Mental health analysis complete. Analyzed ${studentProfiles.length} students.`);

    res.status(200).json({
      success: true,
      data: studentProfiles,
      summary: {
        totalStudents: studentProfiles.length,
        flaggedStudents: studentProfiles.filter(p => p.flaggedIssues > 0).length,
        highRiskStudents: studentProfiles.filter(p => p.overallRisk === 'high' || p.overallRisk === 'critical').length,
        totalIssues: studentProfiles.reduce((sum, p) => sum + p.totalIssues, 0)
      }
    });

  } catch (error) {
    console.error('❌ Mental health analysis error:', error);
    res.status(500).json({
      error: "Failed to analyze mental health",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

export const getMentalHealthAnalysis = async (req: Request, res: Response) => {
  try {
    const { uid: teacherId } = req.user!;
    
    // Get teacher's class information
    const teacherData = await admin.auth().getUser(teacherId);
    
    if (!teacherData.customClaims) {
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "Teacher has no custom claims"
      });
    }

    const teacherClaims = teacherData.customClaims as any;
    let classId: string;

    if (teacherClaims.classId) {
      classId = teacherClaims.classId;
    } else if (teacherClaims.gradeId && teacherClaims.division) {
      classId = `${teacherClaims.gradeId}_${teacherClaims.division}`;
    } else {
      return res.status(400).json({
        error: "Invalid teacher data",
        details: "Cannot determine class information"
      });
    }

    // Get existing analysis results
    const analysisRef = admin.firestore().collection('mental_health_analysis');
    const snapshot = await analysisRef
      .where('classId', '==', classId)
      .orderBy('analyzedAt', 'desc')
      .get();

    const profiles: StudentMentalHealthProfile[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      profiles.push({
        studentId: data.studentId,
        studentName: data.studentName,
        email: data.email,
        totalIssues: data.totalIssues,
        flaggedIssues: data.flaggedIssues,
        lastAnalyzed: data.lastAnalyzed,
        overallRisk: data.overallRisk,
        issues: data.issues || []
      });
    });

    res.status(200).json({
      success: true,
      data: profiles,
      summary: {
        totalStudents: profiles.length,
        flaggedStudents: profiles.filter(p => p.flaggedIssues > 0).length,
        highRiskStudents: profiles.filter(p => p.overallRisk === 'high' || p.overallRisk === 'critical').length,
        totalIssues: profiles.reduce((sum, p) => sum + p.totalIssues, 0)
      }
    });

  } catch (error) {
    console.error('❌ Get mental health analysis error:', error);
    res.status(500).json({
      error: "Failed to get mental health analysis",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}; 

// District Admin: Get flagged students in their district
export const getDistrictFlaggedStudents = async (req, res) => {
  try {
    const { uid } = req.user!;
    const adminData = await admin.auth().getUser(uid);
    const districtId = adminData.customClaims?.districtId;
    if (!districtId) {
      return res.status(400).json({ error: "District admin data not found" });
    }
    const flagsSnapshot = await admin.firestore()
      .collection('studentFlags')
      .where('districtId', '==', districtId)
      .orderBy('dateLastFlagged', 'desc')
      .get();
    const flaggedStudents = flagsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateFirstFlagged: doc.data().dateFirstFlagged,
      dateLastFlagged: doc.data().dateLastFlagged
    }));
    console.log('Flagged students found:', flaggedStudents.length, flaggedStudents.map(f => f.studentName));
    // Group by issue type for summary
    const summaryByIssue = flaggedStudents.reduce((acc, flag) => {
      const issueType = flag.issueType;
      if (!acc[issueType]) {
        acc[issueType] = {
          totalFlags: 0,
          studentsAffected: new Set(),
          resourcesDelivered: 0
        };
      }
      acc[issueType].totalFlags++;
      acc[issueType].studentsAffected.add(flag.studentId);
      if (flag.resourcesDelivered) {
        acc[issueType].resourcesDelivered++;
      }
      return acc;
    }, {});
    Object.keys(summaryByIssue).forEach(issueType => {
      summaryByIssue[issueType].studentsAffected = summaryByIssue[issueType].studentsAffected.size;
    });
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      data: {
        flaggedStudents,
        summary: summaryByIssue,
        totalFlagged: flaggedStudents.length
      }
    });
  } catch (error) {
    console.error('Error fetching district flagged students:', error);
    res.status(500).json({ error: 'Failed to fetch flagged students' });
  }
};

// School Admin: Get flagged students in their school
export const getSchoolFlaggedStudents = async (req, res) => {
  try {
    const { uid } = req.user!;
    const adminData = await admin.auth().getUser(uid);
    const schoolId = adminData.customClaims?.schoolId;
    if (!schoolId) {
      return res.status(400).json({ error: "School admin data not found" });
    }
    const flagsSnapshot = await admin.firestore()
      .collection('studentFlags')
      .where('schoolId', '==', schoolId)
      .orderBy('dateLastFlagged', 'desc')
      .get();
    const flaggedStudents = flagsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateFirstFlagged: doc.data().dateFirstFlagged,
      dateLastFlagged: doc.data().dateLastFlagged
    }));
    // Group by issue type for summary
    const summaryByIssue = flaggedStudents.reduce((acc, flag) => {
      const issueType = flag.issueType;
      if (!acc[issueType]) {
        acc[issueType] = {
          totalFlags: 0,
          studentsAffected: new Set(),
          resourcesDelivered: 0
        };
      }
      acc[issueType].totalFlags++;
      acc[issueType].studentsAffected.add(flag.studentId);
      if (flag.resourcesDelivered) {
        acc[issueType].resourcesDelivered++;
      }
      return acc;
    }, {});
    Object.keys(summaryByIssue).forEach(issueType => {
      summaryByIssue[issueType].studentsAffected = summaryByIssue[issueType].studentsAffected.size;
    });
    return res.status(200).json({
      success: true,
      data: {
        flaggedStudents,
        summary: summaryByIssue,
        totalFlagged: flaggedStudents.length
      }
    });
  } catch (error) {
    console.error('Error fetching school flagged students:', error);
    res.status(500).json({ error: 'Failed to fetch flagged students' });
  }
};

// Teacher: Get flagged students in their class
export const getTeacherFlaggedStudents = async (req, res) => {
  try {
    const { uid } = req.user!;
    const teacherData = await admin.auth().getUser(uid);
    const classId = teacherData.customClaims?.classId;
    if (!classId) {
      return res.status(400).json({ error: "Teacher class data not found" });
    }
    const flagsSnapshot = await admin.firestore()
      .collection('studentFlags')
      .where('classId', '==', classId)
      .orderBy('dateLastFlagged', 'desc')
      .get();
    const flaggedStudents = flagsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dateFirstFlagged: doc.data().dateFirstFlagged,
      dateLastFlagged: doc.data().dateLastFlagged
    }));
    console.log('Teacher classId:', classId);
    console.log('Flagged students found:', flaggedStudents.length, flaggedStudents.map(f => f.studentName));
    // Group by issue type for summary
    const summaryByIssue = flaggedStudents.reduce((acc, flag) => {
      const issueType = flag.issueType;
      if (!acc[issueType]) {
        acc[issueType] = {
          totalFlags: 0,
          studentsAffected: new Set(),
          resourcesDelivered: 0
        };
      }
      acc[issueType].totalFlags++;
      acc[issueType].studentsAffected.add(flag.studentId);
      if (flag.resourcesDelivered) {
        acc[issueType].resourcesDelivered++;
      }
      return acc;
    }, {});
    Object.keys(summaryByIssue).forEach(issueType => {
      summaryByIssue[issueType].studentsAffected = summaryByIssue[issueType].studentsAffected.size;
    });
    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      data: {
        flaggedStudents,
        summary: summaryByIssue,
        totalFlagged: flaggedStudents.length
      }
    });
  } catch (error) {
    console.error('Error fetching teacher flagged students:', error);
    res.status(500).json({ error: 'Failed to fetch flagged students' });
  }
}; 