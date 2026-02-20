import React, { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    deleteDoc,
    updateDoc,
    getDocs,
    limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    Users,
    Trash2,
    Shield,
    Activity,
    ChevronDown,
    ChevronUp,
    Search,
    X,
    CheckCircle,
    Clock,
    AlertCircle,
} from 'lucide-react';

const ROLES = ['admin', 'circulos', 'taller', 'riego', 'ventas'];

const ROLE_LABELS = {
    admin: 'Administrador',
    circulos: 'Círculos',
    taller: 'Taller',
    riego: 'Riego',
    ventas: 'Ventas',
};

const ROLE_COLORS = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    circulos: 'bg-green-100 text-green-800 border-green-200',
    taller: 'bg-campo-green-100 text-campo-green-800 border-campo-green-200',
    riego: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    ventas: 'bg-orange-100 text-orange-800 border-orange-200',
    null: 'bg-campo-beige-100 text-campo-carbon-500 border-campo-beige-200',
};

// ─── Helper: obtener actividades de un usuario ──────────────────────────────
async function fetchUserActivities(uid) {
    const results = [];

    try {
        // Taller tickets
        const tallerQ = query(collection(db, 'taller'), orderBy('createdAt', 'desc'), limit(20));
        const tallerSnap = await getDocs(tallerQ);
        tallerSnap.forEach((d) => {
            const data = d.data();
            if (data.uid === uid) {
                results.push({
                    id: d.id,
                    type: 'taller',
                    label: `Taller: ${data.description || 'Ticket'}`,
                    date: data.createdAt?.toDate?.() || null,
                    detail: data.status || '',
                });
            }
        });

        // Círculos historia
        const circulosSnap = await getDocs(collection(db, 'circulos'));
        for (const circulo of circulosSnap.docs) {
            const historiaSnap = await getDocs(
                query(
                    collection(db, 'circulos', circulo.id, 'historia'),
                    orderBy('timestamp', 'desc'),
                    limit(10)
                )
            );
            historiaSnap.forEach((h) => {
                const hd = h.data();
                if (hd.uid === uid) {
                    results.push({
                        id: h.id,
                        type: 'circulo',
                        label: `Círculo ${circulo.data().nombre || circulo.id}: ${hd.actividad || hd.accion || 'actividad'}`,
                        date: hd.timestamp?.toDate?.() || null,
                        detail: hd.situacion || '',
                    });
                }
            });
        }
    } catch (e) {
        console.error('Error fetching activities', e);
    }

    // Sort by date desc
    return results.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date - a.date;
    });
}

// ─── Subcomponent: ActivityModal ────────────────────────────────────────────
function ActivityModal({ user, onClose }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserActivities(user.uid || user.id).then((acts) => {
            setActivities(acts);
            setLoading(false);
        });
    }, [user]);

    const formatDate = (date) => {
        if (!date) return '—';
        return date.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const typeIcon = (type) => {
        if (type === 'taller') return <span className="text-campo-green-500 font-bold text-xs">TALLER</span>;
        return <span className="text-green-600 font-bold text-xs">CÍRCULO</span>;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-campo-beige-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-campo-beige-100">
                    <div>
                        <h2 className="font-bold text-campo-carbon-900 text-lg">
                            Actividades de {user.displayName || user.email}
                        </h2>
                        <p className="text-xs text-campo-carbon-400">{user.email}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-campo-carbon-400 hover:text-campo-carbon-700 transition-colors p-1 rounded-lg hover:bg-campo-beige-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 px-6 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-campo-green-600" />
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="text-center py-12 text-campo-carbon-400">
                            <Activity size={36} className="mx-auto mb-3 opacity-40" />
                            <p className="font-medium">Sin actividades registradas</p>
                            <p className="text-xs mt-1">
                                Las actividades futuras que incluyan el UID del usuario aparecerán aquí.
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {activities.map((act, i) => (
                                <li
                                    key={act.id + i}
                                    className="flex items-start gap-3 p-3 rounded-xl bg-campo-beige-50 border border-campo-beige-100"
                                >
                                    <div className="pt-0.5">{typeIcon(act.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-campo-carbon-800 truncate">{act.label}</p>
                                        {act.detail && (
                                            <p className="text-xs text-campo-carbon-500 mt-0.5">{act.detail}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-campo-carbon-400 whitespace-nowrap">
                                        {formatDate(act.date)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Subcomponent: DeleteConfirmModal ───────────────────────────────────────
function DeleteConfirmModal({ user, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-campo-beige-100 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                        <Trash2 size={24} className="text-red-500" />
                    </div>
                    <h2 className="font-bold text-campo-carbon-900 text-lg">Eliminar usuario</h2>
                    <p className="text-sm text-campo-carbon-500">
                        ¿Estás seguro de que querés eliminar a{' '}
                        <span className="font-semibold text-campo-carbon-800">{user.displayName || user.email}</span>? Esta
                        acción elimina su acceso al sistema.
                    </p>
                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 rounded-xl border border-campo-beige-200 text-campo-carbon-700 hover:bg-campo-beige-50 font-medium text-sm transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Admin() {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null); // for activity modal
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [updatingRole, setUpdatingRole] = useState(null); // uid being updated
    const [expandedUser, setExpandedUser] = useState(null);
    const [successId, setSuccessId] = useState(null);

    // Real-time listener on usuarios collection
    useEffect(() => {
        const q = query(collection(db, 'usuarios'));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => ({
                id: d.id,
                uid: d.data().uid || d.id,
                ...d.data(),
            }));
            // Sort: admin first, then by displayName
            list.sort((a, b) => {
                if (a.role === 'admin' && b.role !== 'admin') return -1;
                if (b.role === 'admin' && a.role !== 'admin') return 1;
                const na = a.displayName || a.email || '';
                const nb = b.displayName || b.email || '';
                return na.localeCompare(nb);
            });
            setUsuarios(list);
            setLoading(false);
        });
        return unsub;
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        setUpdatingRole(userId);
        try {
            await updateDoc(doc(db, 'usuarios', userId), { role: newRole || null });
            setSuccessId(userId);
            setTimeout(() => setSuccessId(null), 2000);
        } catch (e) {
            console.error('Error updating role:', e);
        } finally {
            setUpdatingRole(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteDoc(doc(db, 'usuarios', deleteTarget.id));
        } catch (e) {
            console.error('Error deleting user:', e);
        } finally {
            setDeleteTarget(null);
        }
    };

    const filtered = usuarios.filter((u) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            (u.displayName || '').toLowerCase().includes(s) ||
            (u.email || '').toLowerCase().includes(s) ||
            (u.role || '').toLowerCase().includes(s)
        );
    });

    const noRole = usuarios.filter((u) => !u.role);
    const withRole = usuarios.filter((u) => u.role);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-campo-green-900 flex items-center justify-center">
                    <Shield size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-campo-green-950">Administración</h1>
                    <p className="text-sm text-campo-carbon-500">Gestión de usuarios y accesos</p>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total usuarios', value: usuarios.length, color: 'text-campo-green-800', bg: 'bg-campo-green-50 border-campo-green-200' },
                    { label: 'Con acceso', value: withRole.length, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
                    { label: 'Sin rol asignado', value: noRole.length, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                    { label: 'Administradores', value: usuarios.filter((u) => u.role === 'admin').length, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
                ].map((s) => (
                    <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                        <p className="text-xs text-campo-carbon-500 font-medium">{s.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Pending users banner */}
            {noRole.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-amber-800 text-sm">
                            {noRole.length} usuario{noRole.length > 1 ? 's' : ''} sin rol asignado
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Estos usuarios se loguearon pero aún no tienen acceso. Asignales un rol desde la lista.
                        </p>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-campo-beige-100 rounded-2xl border border-campo-beige-200 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-campo-beige-100">
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-campo-green-700" />
                        <span className="font-semibold text-campo-carbon-800">Usuarios</span>
                        <span className="text-xs font-medium text-campo-carbon-400 bg-campo-beige-100 px-2 py-0.5 rounded-full">
                            {filtered.length}
                        </span>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-campo-carbon-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar usuario..."
                            className="pl-8 pr-3 py-1.5 text-sm border border-campo-beige-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-campo-green-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-campo-green-600" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-campo-carbon-400">
                        <Users size={36} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No se encontraron usuarios</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map((usuario) => {
                            const isExpanded = expandedUser === usuario.id;
                            const isUpdating = updatingRole === usuario.id;
                            const isSuccess = successId === usuario.id;

                            const initials = usuario.displayName
                                ? usuario.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                                : usuario.email?.[0]?.toUpperCase() || '?';

                            return (
                                <div key={usuario.id} className="transition-colors hover:bg-campo-beige-50">
                                    <div className="flex items-center gap-3 px-6 py-4">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-campo-green-700 flex items-center justify-center text-white font-bold text-sm shrink-0 select-none">
                                            {initials}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-campo-carbon-900 text-sm truncate">
                                                {usuario.displayName || '—'}
                                            </p>
                                            <p className="text-xs text-campo-carbon-400 truncate">{usuario.email}</p>
                                        </div>

                                        {/* Role selector */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isSuccess ? (
                                                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                                    <CheckCircle size={14} /> Guardado
                                                </span>
                                            ) : isUpdating ? (
                                                <Clock size={14} className="animate-spin text-campo-carbon-400" />
                                            ) : null}
                                            <select
                                                value={usuario.role || ''}
                                                onChange={(e) => handleRoleChange(usuario.id, e.target.value)}
                                                disabled={isUpdating}
                                                className={`text-xs font-medium px-2 py-1 rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-campo-green-400 transition-colors ${ROLE_COLORS[usuario.role] || ROLE_COLORS.null
                                                    } disabled:opacity-50`}
                                            >
                                                <option value="">Sin rol</option>
                                                {ROLES.map((r) => (
                                                    <option key={r} value={r}>
                                                        {ROLE_LABELS[r]}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => setSelectedUser(usuario)}
                                                title="Ver actividades"
                                                className="p-2 rounded-lg text-campo-carbon-400 hover:text-campo-green-700 hover:bg-campo-green-50 transition-colors"
                                            >
                                                <Activity size={16} />
                                            </button>
                                            <button
                                                onClick={() => setExpandedUser(isExpanded ? null : usuario.id)}
                                                title="Ver detalles"
                                                className="p-2 rounded-lg text-campo-carbon-400 hover:text-campo-carbon-700 hover:bg-campo-beige-100 transition-colors"
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(usuario)}
                                                title="Eliminar usuario"
                                                className="p-2 rounded-lg text-campo-carbon-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="px-6 pb-4 ml-13">
                                            <div className="ml-13 bg-campo-beige-50 rounded-xl p-4 text-xs space-y-2 border border-campo-beige-100">
                                                <div className="flex gap-2">
                                                    <span className="text-campo-carbon-400 w-20">UID</span>
                                                    <span className="font-mono text-campo-carbon-600 break-all">
                                                        {usuario.uid || usuario.id}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-campo-carbon-400 w-20">Email</span>
                                                    <span className="text-campo-carbon-600">{usuario.email || '—'}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-campo-carbon-400 w-20">Nombre</span>
                                                    <span className="text-campo-carbon-600">
                                                        {usuario.displayName || '—'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-campo-carbon-400 w-20">Rol actual</span>
                                                    <span className="text-campo-carbon-600">
                                                        {ROLE_LABELS[usuario.role] || 'Sin rol'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modals */}
            {selectedUser && (
                <ActivityModal user={selectedUser} onClose={() => setSelectedUser(null)} />
            )}
            {deleteTarget && (
                <DeleteConfirmModal
                    user={deleteTarget}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}
