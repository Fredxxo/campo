import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/firebase.js';

async function logCircles() {
  const snapshot = await getDocs(collection(db, "circles"));
  snapshot.forEach(doc => {
      console.log(doc.id, doc.data().lat, doc.data().lng);
  });
}
logCircles();
