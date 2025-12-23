import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Plus, Search, LogOut, Activity, User, Trash2, Edit2, ChevronLeft, ChevronRight, ShieldCheck, Calendar, Stethoscope } from 'lucide-react'
import PatientModal from '../components/PatientModal'
import DoctorProfileModal from '../components/DoctorProfileModal'
import EmergencyAdmitModal from '../components/EmergencyAdmitModal'
import CaseDetailsModal from '../components/CaseDetailsModal'
import CreateCaseModal from '../components/CreateCaseModal'

// Helper to get API URL
const getApiUrl = () => {
    const urlFromEnv = import.meta.env.VITE_API_URL
    return urlFromEnv !== undefined ? urlFromEnv : 'http://localhost:5000'
}

export default function Dashboard() {
    const navigate = useNavigate()
    const [patients, setPatients] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState<any>({})
    const [casePage, setCasePage] = useState(1)
    const [casePagination, setCasePagination] = useState<any>({})
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [patientModalMode, setPatientModalMode] = useState<'create' | 'edit' | 'profile'>('create')
    const [selectedPatient, setSelectedPatient] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [modalPreset, setModalPreset] = useState<{ status?: any; admit_type?: any } | undefined>(undefined)
    const [activeTab, setActiveTab] = useState<'profiles' | 'cases' | 'appointments'>('profiles')
    const [doctorProfile, setDoctorProfile] = useState<any>(null)
    const [isDoctorProfileOpen, setIsDoctorProfileOpen] = useState(false)
    const [isCaseDetailsOpen, setIsCaseDetailsOpen] = useState(false)
    const [caseId, setCaseId] = useState<string | null>(null)
    const [isEmergencyOpen, setIsEmergencyOpen] = useState(false)
    const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false)
    const [casePrefillId, setCasePrefillId] = useState<string | null>(null)
    const [caseStatusFilter, setCaseStatusFilter] = useState('All')
    const [caseAdmitTypeFilter, setCaseAdmitTypeFilter] = useState('All')
    const [stats, setStats] = useState({ total: 0, active: 0, closed: 0 })
    const [appointments, setAppointments] = useState<any[]>([])
    const [cases, setCases] = useState<any[]>([])
    const [appointmentPage, setAppointmentPage] = useState(1)
    const [appointmentPagination, setAppointmentPagination] = useState<any>({})
    const [appointmentStatusFilter, setAppointmentStatusFilter] = useState('Scheduled')
    const [patientOptions, setPatientOptions] = useState<any[]>([])
    const [appointmentForm, setAppointmentForm] = useState({
        patient_id: '',
        scheduled_at: '',
        reason: '',
    })
    const [editingCaseId, setEditingCaseId] = useState<string | null>(null)
    const [editingCaseField, setEditingCaseField] = useState<'status' | 'admit_type' | null>(null)
    const [editingCaseValue, setEditingCaseValue] = useState('')
    const [rescheduleId, setRescheduleId] = useState<string | null>(null)
    const [rescheduleValue, setRescheduleValue] = useState('')

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
                params: { page, limit: 5, search },
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
        if (activeTab === 'profiles') {
            fetchPatients()
        }
        fetchStats()
    }, [page, search, activeTab])

    useEffect(() => {
        fetchPatientOptions()
    }, [])

    const fetchCases = async () => {
        setLoading(true)
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/cases`, {
                params: { page: casePage, limit: 5, search, status: caseStatusFilter, admit_type: caseAdmitTypeFilter },
                headers
            })
            setCases(res.data.data || [])
            setCasePagination(res.data.pagination || {})
        } catch (error) {
            console.error(error)
            toast.error('Failed to load cases')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'cases') {
            fetchCases()
        }
    }, [casePage, search, caseStatusFilter, caseAdmitTypeFilter, activeTab])

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

    const handleCaseInlineUpdate = async (id: string, updates: { status?: string; admit_type?: string }) => {
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            await axios.put(`${getApiUrl()}/api/cases/${id}`, updates, { headers })
            if (updates.status) {
                toast.success(`Status updated to ${updates.status}`)
            } else if (updates.admit_type) {
                toast.success(`Admission set to ${updates.admit_type}`)
            } else {
                toast.success('Case updated')
            }
            fetchCases()
            fetchStats()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update case')
        }
    }

    const startCaseEdit = (caseItem: any, field: 'status' | 'admit_type') => {
        setEditingCaseId(caseItem.id)
        setEditingCaseField(field)
        if (field === 'status') {
            setEditingCaseValue(normalizeCaseStatus(caseItem.status) || 'Active')
        } else {
            setEditingCaseValue(caseItem.admit_type || 'Routine')
        }
    }

    const cancelCaseEdit = () => {
        setEditingCaseId(null)
        setEditingCaseField(null)
        setEditingCaseValue('')
    }

    const saveCaseEdit = async () => {
        if (!editingCaseId || !editingCaseField) return
        const updates = editingCaseField === 'status'
            ? { status: editingCaseValue }
            : { admit_type: editingCaseValue }
        await handleCaseInlineUpdate(editingCaseId, updates)
        cancelCaseEdit()
    }

    const normalizeCaseStatus = (status?: string) => {
        if (!status) return 'Active'
        if (['Admitted', 'Critical', 'Stable', 'Discharged'].includes(status)) return 'Active'
        return status
    }

    const handleCreateAppointment = async () => {
        if (!appointmentForm.patient_id || !appointmentForm.scheduled_at) {
            toast.error('Select a patient and time')
            return
        }
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const payload = {
                patient_id: appointmentForm.patient_id,
                scheduled_at: appointmentForm.scheduled_at,
                reason: appointmentForm.reason,
            }
            await axios.post(`${getApiUrl()}/api/appointments`, payload, { headers })
            toast.success('Appointment scheduled')
            setAppointmentForm({ patient_id: '', scheduled_at: '', reason: '' })
            setAppointmentPage(1)
            fetchAppointments()
            fetchCases()
            fetchStats()
        } catch (error) {
            console.error(error)
            toast.error('Failed to schedule appointment')
        }
    }

    const toInputDateTime = (value: string) => {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return ''
        const pad = (num: number) => String(num).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    const startReschedule = (appointment: any) => {
        setRescheduleId(appointment.id)
        setRescheduleValue(toInputDateTime(appointment.scheduled_at))
    }

    const cancelReschedule = () => {
        setRescheduleId(null)
        setRescheduleValue('')
    }

    const handleRescheduleSave = async () => {
        if (!rescheduleId || !rescheduleValue) {
            toast.error('Select a new time')
            return
        }
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            await axios.put(`${getApiUrl()}/api/appointments/${rescheduleId}`, {
                scheduled_at: new Date(rescheduleValue).toISOString(),
            }, { headers })
            toast.success('Appointment rescheduled')
            fetchAppointments()
            cancelReschedule()
        } catch (error) {
            console.error(error)
            toast.error('Failed to reschedule')
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

    const handleViewCaseAttachment = async (id: string) => {
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/cases/${id}/attachment`, { headers })
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

    const handleCaseChange = () => {
        fetchPatients()
        fetchCases()
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
                                className="hidden sm:flex items-center gap-2 text-sm text-slate-600 bg-slate-100 pr-3 pl-1.5 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                {doctorProfile?.avatar_url ? (
                                    <img
                                        src={supabase.storage.from('file_bucket').getPublicUrl(doctorProfile.avatar_url).data.publicUrl}
                                        alt="Avatar"
                                        className="h-6 w-6 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="bg-white p-1 rounded-full">
                                        <User className="h-4 w-4" />
                                    </div>
                                )}
                                <span className="font-medium">{doctorProfile?.display_name || 'Doctor profile'}</span>
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
                        onClick={() => { setCasePrefillId(null); setIsCreateCaseOpen(true) }}>
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Plus className="h-24 w-24" />
                        </div>
                        <p className="text-indigo-100 font-medium mb-1">Quick Action</p>
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            Create Active Case <Plus className="h-5 w-5" />
                        </h3>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <button
                        onClick={() => { setPage(1); setActiveTab('profiles') }}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'profiles'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Profiles
                    </button>
                    <button
                        onClick={() => { setCasePage(1); setActiveTab('cases') }}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'cases'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Cases
                    </button>
                    <button
                        onClick={() => { setAppointmentPage(1); setActiveTab('appointments') }}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === 'appointments'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Appointments
                    </button>
                </div>

                {activeTab === 'profiles' && (
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
                                    onChange={(e) => { setPage(1); setSearch(e.target.value) }}
                                />
                            </div>
                        </div>
                        <div className="w-full sm:w-56">
                            <button
                                onClick={() => { setSelectedPatient(null); setModalPreset(undefined); setPatientModalMode('create'); setIsModalOpen(true) }}
                                className="w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                Create Patient
                            </button>
                        </div>


                        {/* Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Info</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">DOB</th>
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
                                                    <div className="text-sm text-slate-900">{patient.dob}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => { setCasePrefillId(patient.id); setIsCreateCaseOpen(true) }}
                                                        className="text-slate-500 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded-lg transition-colors mr-1"
                                                        title="Create case"
                                                    >
                                                        <Stethoscope className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/patients/${patient.id}`)}
                                                        className="text-slate-500 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded-lg transition-colors mr-1"
                                                        title="View profile"
                                                    >
                                                        <User className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => { setSelectedPatient(patient); setModalPreset(undefined); setPatientModalMode('profile'); setIsModalOpen(true) }} className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-lg transition-colors mr-1">
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

                {activeTab === 'cases' && (
                    <>
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
                                    onChange={(e) => { setCasePage(1); setSearch(e.target.value) }}
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
                                    value={caseStatusFilter}
                                    onChange={(e) => { setCasePage(1); setCaseStatusFilter(e.target.value) }}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Active">Active</option>
                                    <option value="Upcoming">Upcoming</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>
                            <div className="w-full sm:w-56">
                                <select
                                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    value={caseAdmitTypeFilter}
                                    onChange={(e) => { setCasePage(1); setCaseAdmitTypeFilter(e.target.value) }}
                                >
                                    <option value="All">All Admit Types</option>
                                    <option value="Routine">Routine</option>
                                    <option value="Emergency">Emergency</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Case</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Admission</th>
                                            <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {loading && cases.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading cases...</td></tr>
                                        ) : cases.length === 0 ? (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No cases found.</td></tr>
                                        ) : cases.map((caseItem) => (
                                            <tr key={caseItem.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {caseItem.patients ? `${caseItem.patients.first_name} ${caseItem.patients.last_name}` : 'Unknown patient'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{caseItem.diagnosis || caseItem.admit_reason || 'No case details'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {editingCaseId === caseItem.id && editingCaseField === 'status' ? (
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                                                                value={editingCaseValue}
                                                                onChange={(e) => setEditingCaseValue(e.target.value)}
                                                            >
                                                                <option value="Active">Active</option>
                                                                <option value="Upcoming">Upcoming</option>
                                                                <option value="Closed">Closed</option>
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={saveCaseEdit}
                                                                className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelCaseEdit}
                                                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${normalizeCaseStatus(caseItem.status) === 'Closed' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                                normalizeCaseStatus(caseItem.status) === 'Upcoming' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                }`}>
                                                                {normalizeCaseStatus(caseItem.status)}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => startCaseEdit(caseItem, 'status')}
                                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingCaseId === caseItem.id && editingCaseField === 'admit_type' ? (
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                                                                value={editingCaseValue}
                                                                onChange={(e) => setEditingCaseValue(e.target.value)}
                                                            >
                                                                <option value="Routine">Routine</option>
                                                                <option value="Emergency">Emergency</option>
                                                            </select>
                                                            <button
                                                                type="button"
                                                                onClick={saveCaseEdit}
                                                                className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelCaseEdit}
                                                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-sm text-slate-900">{caseItem.admit_type || 'Routine'}</div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startCaseEdit(caseItem, 'admit_type')}
                                                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                                                                >
                                                                    Edit
                                                                </button>
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1">
                                                                {caseItem.started_at ? new Date(caseItem.started_at).toLocaleString() : 'No start time'}
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex flex-wrap justify-end gap-2">
                                                        <button
                                                            onClick={() => { setCaseId(caseItem.id); setIsCaseDetailsOpen(true) }}
                                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                        >
                                                            Open case
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/patients/${caseItem.patient_id}`)}
                                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                        >
                                                            View profile
                                                        </button>
                                                        {caseItem.attachment_path && (
                                                            <button
                                                                onClick={() => handleViewCaseAttachment(caseItem.id)}
                                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                            >
                                                                Attachment
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-white px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-slate-700">
                                            Showing page <span className="font-medium">{casePage}</span> of <span className="font-medium">{casePagination.totalPages || 1}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => setCasePage(p => Math.max(1, p - 1))}
                                                disabled={casePage === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                <ChevronLeft className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setCasePage(p => p + 1)}
                                                disabled={casePage >= (casePagination.totalPages || 1)}
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
                                    <div key={appt.id} className="p-6 flex flex-col gap-3">
                                        <div className="flex items-center justify-between gap-4">
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
                                                    onClick={() => startReschedule(appt)}
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                >
                                                    Reschedule
                                                </button>
                                                <button
                                                    onClick={() => handleAppointmentDelete(appt.id)}
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        {rescheduleId === appt.id && (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="datetime-local"
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                                                    value={rescheduleValue}
                                                    onChange={(e) => setRescheduleValue(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRescheduleSave}
                                                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelReschedule}
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
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

            {
                isModalOpen && (
                    <PatientModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        patient={selectedPatient}
                        onSuccess={handlePatientChange}
                        preset={modalPreset}
                        mode={patientModalMode}
                    />
                )
            }

            {
                isDoctorProfileOpen && (
                    <DoctorProfileModal
                        isOpen={isDoctorProfileOpen}
                        onClose={() => setIsDoctorProfileOpen(false)}
                        onSaved={handleDoctorProfileSaved}
                    />
                )
            }

            {
                isEmergencyOpen && (
                    <EmergencyAdmitModal
                        isOpen={isEmergencyOpen}
                        onClose={() => setIsEmergencyOpen(false)}
                        onSuccess={handleCaseChange}
                        patientOptions={patientOptions}
                    />
                )
            }

            {
                isCreateCaseOpen && (
                    <CreateCaseModal
                        isOpen={isCreateCaseOpen}
                        onClose={() => setIsCreateCaseOpen(false)}
                        onSuccess={handleCaseChange}
                        patientOptions={patientOptions}
                        preselectedPatientId={casePrefillId}
                    />
                )
            }

            {
                isCaseDetailsOpen && (
                    <CaseDetailsModal
                        isOpen={isCaseDetailsOpen}
                        onClose={() => { setIsCaseDetailsOpen(false); setCaseId(null) }}
                        caseId={caseId}
                        onUpdated={handleCaseChange}
                    />
                )
            }

        </div >
    )
}
