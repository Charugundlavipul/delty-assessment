import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Plus, Search, LogOut, Activity, User, Trash2, Edit2, ChevronLeft, ChevronRight, FileText, ShieldCheck, AlertTriangle, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import PatientModal from '../components/PatientModal'
import PatientProfileModal from '../components/PatientProfileModal'
import DoctorProfileModal from '../components/DoctorProfileModal'
import ConfirmModal from '../components/ConfirmModal'
import EmergencyAdmitModal from '../components/EmergencyAdmitModal'

// Helper to get API URL
const getApiUrl = () => {
    const urlFromEnv = import.meta.env.VITE_API_URL
    return urlFromEnv !== undefined ? urlFromEnv : 'http://localhost:5000'
}

export default function Dashboard() {
    const [patients, setPatients] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState<any>({})
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [patientModalMode, setPatientModalMode] = useState<'create' | 'edit'>('create')
    const [selectedPatient, setSelectedPatient] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [modalPreset, setModalPreset] = useState<{ status?: any; admit_type?: any } | undefined>(undefined)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [profilePatientId, setProfilePatientId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'patients' | 'appointments'>('patients')
    const [doctorProfile, setDoctorProfile] = useState<any>(null)
    const [isDoctorProfileOpen, setIsDoctorProfileOpen] = useState(false)
    const [confirmState, setConfirmState] = useState<{ open: boolean; patientId: string | null; status: string | null }>({
        open: false,
        patientId: null,
        status: null,
    })
    const [isEmergencyOpen, setIsEmergencyOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState('All')
    const [stats, setStats] = useState({ total: 0, critical: 0, admitted: 0, stable: 0, discharged: 0, active: 0, closed: 0 })
    const [appointments, setAppointments] = useState<any[]>([])
    const [appointmentPage, setAppointmentPage] = useState(1)
    const [appointmentPagination, setAppointmentPagination] = useState<any>({})
    const [appointmentStatusFilter, setAppointmentStatusFilter] = useState('Scheduled')
    const [patientOptions, setPatientOptions] = useState<any[]>([])
    const [appointmentForm, setAppointmentForm] = useState({
        patient_id: '',
        scheduled_at: '',
        reason: ''
    })

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !session.user) return null
        return { Authorization: `Bearer ${session.access_token}` }
    }

    const fetchPatients = async () => {
        setLoading(true)
        try {
            const headers = await getAuthHeaders()
            if (!headers) return

            const res = await axios.get(`${getApiUrl()}/api/patients`, {
                params: { page, limit: 5, search, status: statusFilter },
                headers
            })
            setPatients(res.data.data)
            setPagination(res.data.pagination)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load patients')
        } finally {
            setLoading(false)
        }
    }

    const fetchPatientOptions = async () => {
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/patients`, {
                params: { page: 1, limit: 100, search: '' },
                headers
            })
            setPatientOptions(res.data.data || [])
        } catch (error) {
            console.error(error)
        }
    }

    const fetchStats = async () => {
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/patients/stats`, { headers })
            setStats(res.data)
        } catch (error) {
            console.error(error)
        }
    }

    const fetchDoctorProfile = async () => {
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/doctors/me`, { headers })
            setDoctorProfile(res.data.profile || null)
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        fetchPatients()
        fetchStats()
    }, [page, search, statusFilter])

    useEffect(() => {
        fetchPatientOptions()
    }, [])

    useEffect(() => {
        fetchDoctorProfile()
    }, [])

    const fetchAppointments = async () => {
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/appointments`, {
                params: { page: appointmentPage, limit: 5, status: appointmentStatusFilter },
                headers
            })
            setAppointments(res.data.data || [])
            setAppointmentPagination(res.data.pagination || {})
        } catch (error) {
            console.error(error)
            toast.error('Failed to load appointments')
        }
    }

    useEffect(() => {
        fetchAppointments()
    }, [appointmentPage, appointmentStatusFilter])

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this patient record?')) return
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            await axios.delete(`${getApiUrl()}/api/patients/${id}`, {
                headers
            })
            toast.success('Patient deleted')
            fetchPatients()
            fetchStats()
        } catch (error) {
            toast.error('Failed to delete')
        }
    }

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            await axios.patch(`${getApiUrl()}/api/patients/${id}/status`, { status }, { headers })
            toast.success(`Status updated to ${status}`)
            fetchPatients()
            fetchStats()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update status')
        }
    }

    const requestStatusChange = (id: string, status: string) => {
        setConfirmState({ open: true, patientId: id, status })
    }

    const confirmStatusChange = async () => {
        if (!confirmState.patientId || !confirmState.status) return
        await handleStatusUpdate(confirmState.patientId, confirmState.status)
        setConfirmState({ open: false, patientId: null, status: null })
    }

    const handleCreateAppointment = async () => {
        if (!appointmentForm.patient_id || !appointmentForm.scheduled_at) {
            toast.error('Select a patient and time')
            return
        }
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            await axios.post(`${getApiUrl()}/api/appointments`, appointmentForm, { headers })
            toast.success('Appointment scheduled')
            setAppointmentForm({ patient_id: '', scheduled_at: '', reason: '' })
            setAppointmentPage(1)
            fetchAppointments()
        } catch (error) {
            console.error(error)
            toast.error('Failed to schedule appointment')
        }
    }

    const handleAppointmentStatus = async (id: string, status: string) => {
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            await axios.patch(`${getApiUrl()}/api/appointments/${id}/status`, { status }, { headers })
            toast.success(`Appointment ${status.toLowerCase()}`)
            fetchAppointments()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update appointment')
        }
    }

    const handleAppointmentDelete = async (id: string) => {
        if (!confirm('Delete this appointment?')) return
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            await axios.delete(`${getApiUrl()}/api/appointments/${id}`, { headers })
            toast.success('Appointment deleted')
            fetchAppointments()
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete appointment')
        }
    }

    const handleViewAttachment = async (id: string) => {
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/patients/${id}/attachment`, { headers })
            window.open(res.data.url, '_blank', 'noopener,noreferrer')
        } catch (error) {
            console.error(error)
            toast.error('Unable to open attachment')
        }
    }

    const handlePatientChange = () => {
        fetchPatients()
        fetchStats()
        fetchPatientOptions()
    }

    const handleDoctorProfileSaved = () => {
        fetchDoctorProfile()
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Navigation */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 p-2 rounded-lg">
                                <Activity className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-slate-900 tracking-tight">MediTrack</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsDoctorProfileOpen(true)}
                                className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                <User className="h-4 w-4" />
                                <span>{doctorProfile?.display_name || 'Doctor profile'}</span>
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Patients</p>
                            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl">
                            <User className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Cases</p>
                            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.active}</p>
                            <p className="text-xs text-slate-500 mt-1">Critical: {stats.critical}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl">
                            <Activity className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Closed Cases</p>
                            <p className="text-3xl font-bold text-slate-900 mt-1">{stats.closed}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-xl">
                            <ShieldCheck className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                    <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg shadow-indigo-200 text-white flex flex-col justify-center items-start relative overflow-hidden group cursor-pointer hover:bg-indigo-700 transition-colors"
                        onClick={() => { setSelectedPatient(null); setModalPreset(undefined); setPatientModalMode('create'); setIsModalOpen(true) }}>
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Plus className="h-24 w-24" />
                        </div>
                        <p className="text-indigo-100 font-medium mb-1">Quick Action</p>
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            Create Patient <Plus className="h-5 w-5" />
                        </h3>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('patients')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'patients'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Patients
                    </button>
                    <button
                        onClick={() => setActiveTab('appointments')}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'appointments'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Appointments
                    </button>
                </div>

                {activeTab === 'patients' && (
                    <>
                {/* Filters & Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                    <div className="relative w-full sm:w-96 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                            placeholder="Search by name, diagnosis..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsEmergencyOpen(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                    >
                        Emergency Admit
                    </button>
                    <div className="w-full sm:w-56">
                        <select
                            className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={statusFilter}
                            onChange={(e) => { setPage(1); setStatusFilter(e.target.value) }}
                        >
                            <option value="All">All Statuses</option>
                            <option value="Admitted">Admitted</option>
                            <option value="Stable">Stable</option>
                            <option value="Critical">Critical</option>
                            <option value="Discharged">Discharged</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Info</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnosis</th>
                                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {loading && patients.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading records...</td></tr>
                                ) : patients.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">No patients found.</td></tr>
                                ) : patients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                        {patient.first_name[0]}{patient.last_name[0]}
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-slate-900">{patient.first_name} {patient.last_name}</div>
                                                    <div className="text-xs text-slate-500">Born {new Date(patient.dob).getFullYear()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${patient.status === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    patient.status === 'Discharged' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                {patient.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-900 max-w-xs truncate">{patient.diagnosis || 'No initial diagnosis'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => { setProfilePatientId(patient.id); setIsProfileOpen(true) }}
                                                className="text-slate-500 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded-lg transition-colors mr-1"
                                                title="View profile"
                                            >
                                                <User className="h-4 w-4" />
                                            </button>
                                            {patient.attachment_path && (
                                                <button
                                                    onClick={() => handleViewAttachment(patient.id)}
                                                    className="text-slate-500 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded-lg transition-colors mr-1"
                                                    title="View attachment"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => requestStatusChange(patient.id, 'Stable')}
                                                disabled={patient.status === 'Stable'}
                                                className="text-slate-500 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-lg transition-colors mr-1 disabled:opacity-40"
                                                title="Mark as Stable"
                                            >
                                                <Activity className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => requestStatusChange(patient.id, 'Discharged')}
                                                disabled={patient.status === 'Discharged'}
                                                className="text-slate-500 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-lg transition-colors mr-1 disabled:opacity-40"
                                                title="Mark as Discharged"
                                            >
                                                <ShieldCheck className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => requestStatusChange(patient.id, 'Critical')}
                                                disabled={patient.status === 'Critical'}
                                                className="text-slate-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors mr-1 disabled:opacity-40"
                                                title="Mark as Critical"
                                            >
                                                <AlertTriangle className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => { setSelectedPatient(patient); setModalPreset(undefined); setPatientModalMode('edit'); setIsModalOpen(true) }} className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors mr-1">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => handleDelete(patient.id)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-slate-700">
                                    Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{pagination.totalPages || 1}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= (pagination.totalPages || 1)}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
                    </>
                )}

                {activeTab === 'appointments' && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-indigo-600" />
                                <h3 className="text-lg font-semibold text-slate-900">Upcoming Appointments</h3>
                            </div>
                            <select
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                                value={appointmentStatusFilter}
                                onChange={(e) => { setAppointmentPage(1); setAppointmentStatusFilter(e.target.value) }}
                            >
                                <option value="Scheduled">Scheduled</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="All">All</option>
                            </select>
                        </div>
                        <div className="divide-y divide-slate-200">
                            {appointments.length === 0 ? (
                                <div className="p-6 text-sm text-slate-500">No appointments found.</div>
                            ) : appointments.map((appt) => (
                                <div key={appt.id} className="p-6 flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {appt.patients ? `${appt.patients.first_name} ${appt.patients.last_name}` : 'Unknown patient'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(appt.scheduled_at).toLocaleString()} {appt.reason ? `- ${appt.reason}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${appt.status === 'Cancelled' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    'bg-indigo-50 text-indigo-700 border-indigo-200'
                                            }`}>{appt.status}</span>
                                        <button
                                            onClick={() => handleAppointmentStatus(appt.id, 'Completed')}
                                            disabled={appt.status === 'Completed'}
                                            className="text-emerald-600 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-lg disabled:opacity-40"
                                            title="Mark completed"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleAppointmentStatus(appt.id, 'Cancelled')}
                                            disabled={appt.status === 'Cancelled'}
                                            className="text-slate-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg disabled:opacity-40"
                                            title="Cancel appointment"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleAppointmentDelete(appt.id)}
                                            className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"
                                            title="Delete appointment"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
                            <p className="text-xs text-slate-500">Page {appointmentPagination.page || appointmentPage} of {appointmentPagination.totalPages || 1}</p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setAppointmentPage(p => Math.max(1, p - 1))}
                                    disabled={appointmentPage === 1}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={() => setAppointmentPage(p => p + 1)}
                                    disabled={appointmentPage >= (appointmentPagination.totalPages || 1)}
                                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Schedule Appointment</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Patient</label>
                                <select
                                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                                    value={appointmentForm.patient_id}
                                    onChange={(e) => setAppointmentForm({ ...appointmentForm, patient_id: e.target.value })}
                                >
                                    <option value="">Select patient</option>
                                    {patientOptions.map((p) => (
                                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                                    value={appointmentForm.scheduled_at}
                                    onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduled_at: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason</label>
                                <textarea
                                    rows={3}
                                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                                    value={appointmentForm.reason}
                                    onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleCreateAppointment}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                Schedule
                            </button>
                        </div>
                    </div>
                </div>
                )}
            </main>

            {isModalOpen && (
                <PatientModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    patient={selectedPatient}
                    onSuccess={handlePatientChange}
                    preset={modalPreset}
                    mode={patientModalMode}
                />
            )}

            {isProfileOpen && (
                <PatientProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    patientId={profilePatientId}
                    onUpdated={handlePatientChange}
                />
            )}

            {isDoctorProfileOpen && (
                <DoctorProfileModal
                    isOpen={isDoctorProfileOpen}
                    onClose={() => setIsDoctorProfileOpen(false)}
                    onSaved={handleDoctorProfileSaved}
                />
            )}

            {isEmergencyOpen && (
                <EmergencyAdmitModal
                    isOpen={isEmergencyOpen}
                    onClose={() => setIsEmergencyOpen(false)}
                    onSuccess={handlePatientChange}
                    patientOptions={patientOptions}
                />
            )}

            <ConfirmModal
                isOpen={confirmState.open}
                title="Confirm status change"
                message={confirmState.status ? `Set patient status to ${confirmState.status}?` : 'Set patient status?'}
                confirmLabel="Update status"
                onConfirm={confirmStatusChange}
                onCancel={() => setConfirmState({ open: false, patientId: null, status: null })}
            />
        </div>
    )
}
