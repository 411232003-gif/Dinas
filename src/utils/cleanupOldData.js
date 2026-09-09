import { db } from '../firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Delete documents older than 1 week (7 days)
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function cleanupOldData() {
  console.log('Starting cleanup of old data...');
  
  const now = Date.now();
  const cutoffDate = now - ONE_WEEK_MS;
  
  const collectionsToClean = [
    { path: 'couples', subcollections: ['messages', 'loveNotes', 'wishlist', 'timeline', 'reminders', 'notifications'] },
  ];

  let totalDeleted = 0;

  try {
    for (const collectionConfig of collectionsToClean) {
      // Clean main collection documents
      await cleanCollection(collectionConfig.path, cutoffDate, totalDeleted);
      
      // Clean subcollections
      if (collectionConfig.subcollections) {
        const mainCollectionRef = collection(db, collectionConfig.path);
        const mainSnapshot = await getDocs(mainCollectionRef);
        
        for (const mainDoc of mainSnapshot.docs) {
          for (const subcollection of collectionConfig.subcollections) {
            const subcollectionPath = `${collectionConfig.path}/${mainDoc.id}/${subcollection}`;
            await cleanCollection(subcollectionPath, cutoffDate, totalDeleted);
          }
        }
      }
    }
    
    console.log(`Cleanup completed. Total documents deleted: ${totalDeleted}`);
    return totalDeleted;
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

async function cleanCollection(collectionPath, cutoffDate, totalDeleted) {
  try {
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef, where('createdAt', '<', cutoffDate));
    const snapshot = await getDocs(q);
    
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(doc(db, collectionPath, docSnapshot.id));
      totalDeleted++;
      console.log(`Deleted document from ${collectionPath}: ${docSnapshot.id}`);
    }
  } catch (error) {
    console.error(`Error cleaning collection ${collectionPath}:`, error);
  }
}

export async function cleanupSpecificCollection(collectionPath, subcollectionPath = null) {
  const now = Date.now();
  const cutoffDate = now - ONE_WEEK_MS;
  
  try {
    if (subcollectionPath) {
      const fullCollectionPath = `${collectionPath}/${subcollectionPath}`;
      await cleanCollection(fullCollectionPath, cutoffDate, 0);
    } else {
      await cleanCollection(collectionPath, cutoffDate, 0);
    }
  } catch (error) {
    console.error('Error during specific collection cleanup:', error);
    throw error;
  }
}
