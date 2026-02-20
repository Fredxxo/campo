import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Returns { user, role, loading }
 * role puede ser: 'admin' | 'circulos' | 'taller' | 'riego' | null
 */
const useRole = () => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                try {
                    const snap = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
                    if (snap.exists()) {
                        setRole(snap.data().role || null);
                    } else {
                        // Si no tiene documento en Firestore, sin rol
                        setRole(null);
                    }
                } catch (e) {
                    console.error('Error al obtener rol:', e);
                    setRole(null);
                }
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return { user, role, loading };
};

export default useRole;
