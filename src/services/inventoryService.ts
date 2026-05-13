import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { addDays } from 'date-fns';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface InventoryItem {
  id?: string;
  name: string;
  category: string;
  purchaseDate: Date;
  expiryDate: Date;
  status: 'fresh' | 'used' | 'wasted';
  userId: string;
  imageUrl?: string;
}

export const inventoryService = {
  async addItem(item: Omit<InventoryItem, 'id' | 'userId'>) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated");

    const path = `users/${userId}/items`;
    try {
      const data: any = {
        name: item.name,
        category: item.category,
        userId,
        purchaseDate: Timestamp.fromDate(item.purchaseDate),
        expiryDate: Timestamp.fromDate(item.expiryDate),
        status: item.status || 'fresh',
        createdAt: serverTimestamp(),
      };

      if (item.imageUrl !== undefined) {
        data.imageUrl = item.imageUrl;
      }

      const docRef = await addDoc(collection(db, path), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async addItemsBatch(items: Omit<InventoryItem, 'id' | 'userId'>[]) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("User not authenticated");

    const results = [];
    for (const item of items) {
      results.push(this.addItem(item));
    }
    return Promise.all(results);
  },

  async getItems() {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const path = `users/${userId}/items`;
    try {
      const q = query(
        collection(db, path),
        where("userId", "==", userId),
        orderBy("expiryDate", "asc")
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        purchaseDate: (doc.data().purchaseDate as Timestamp).toDate(),
        expiryDate: (doc.data().expiryDate as Timestamp).toDate(),
      })) as InventoryItem[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async markAsUsed(itemId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const path = `users/${userId}/items/${itemId}`;
    try {
      await updateDoc(doc(db, path), { status: 'used', updatedAt: serverTimestamp() });
      await this.recalculateWasteScore();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async markAsWasted(itemId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const path = `users/${userId}/items/${itemId}`;
    try {
      await updateDoc(doc(db, path), { status: 'wasted', updatedAt: serverTimestamp() });
      await this.recalculateWasteScore();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteItem(itemId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    const path = `users/${userId}/items/${itemId}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Waste Score logic:
   * (Wasted Items / (Used Items + Wasted Items)) * 100
   * Lower is better.
   */
  async recalculateWasteScore() {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
      const items = await this.getItems();
      const used = items.filter(i => i.status === 'used').length;
      const wasted = items.filter(i => i.status === 'wasted').length;
      
      const totalTerminated = used + wasted;
      const score = totalTerminated === 0 ? 0 : (wasted / totalTerminated) * 100;

      const userPath = `users/${userId}`;
      await updateDoc(doc(db, userPath), { wasteScore: score, updatedAt: serverTimestamp() });
    } catch (error) {
      console.error("Error recalculating waste score", error);
    }
  }
};
