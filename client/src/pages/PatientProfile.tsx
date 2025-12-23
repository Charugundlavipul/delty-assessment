import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { supabase } from '../supabaseClient'
import { ArrowLeft, FileText, Calendar, ClipboardList, Edit, User, Clock, Activity, MapPin, File, ChevronRight } from 'lucide-react'
import PatientModal from '../components/PatientModal'
import CreateCaseModal from '../components/CreateCaseModal'
import CaseDetailsModal from '../components/CaseDetailsModal'

const getApiUrl = () => {
    const urlFromEnv = import.meta.env.VITE_API_URL
    return urlFromEnv !== undefined ? urlFromEnv : 'http://localhost:5000'
}

export default function PatientProfile() {
    const navigate = useNavigate()
    const { id } = useParams()
    const [loading, setLoading] = useState(false)
    const [profile, setProfile] = useState<any>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false)
    const [isCaseDetailsOpen, setIsCaseDetailsOpen] = useState(false)
    const [activeCaseId, setActiveCaseId] = useState<string | null>(null)

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !session.user) return null
        return { Authorization: `Bearer ${session.access_token}` }
    }

    const fetchProfile = async () => {
        if (!id) return
        setLoading(true)
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/patients/${id}/profile`, { headers })
            setProfile(res.data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load patient profile')
        } finally {
            setLoading(false)
        }
    }

    const handleViewAttachment = async () => {
        if (!id) return
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

    useEffect(() => {
        fetchProfile()
    }, [id])

    const patient = profile?.patient
    const appointments = profile?.appointments || []
    const cases = profile?.cases || []
    const notes = profile?.notes || []

    const normalizeCaseStatus = (status?: string) => {
        if (!status) return 'Active'
        if (status === 'Discharged') return 'Closed'
        if (['Admitted', 'Stable', 'Critical'].includes(status)) return 'Active'
        return status
    }

    if (loading || !patient) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header / Nav */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center h-16 gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Gradient Profile Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity className="h-64 w-64 text-white" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 text-white text-4xl font-bold shadow-lg">
                                    {patient.first_name[0]}{patient.last_name[0]}
                                </div>
                                <div className="text-white">
                                    <h1 className="text-4xl font-bold tracking-tight">{patient.first_name} {patient.last_name}</h1>
                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-indigo-50 font-medium">
                                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-md border border-white/10">
                                            <Clock className="h-4 w-4" />
                                            {patient.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs` : 'Age N/A'}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-md border border-white/10">
                                            <MapPin className="h-4 w-4" />
                                            {patient.admit_type || 'Routine'}
                                        </span>
                                        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm backdrop-blur-md border border-white/10 ${patient.status === 'Critical' ? 'bg-red-500/20 text-red-50' :
                                            patient.status === 'Stable' ? 'bg-emerald-500/20 text-emerald-50' :
                                                'bg-slate-500/20 text-slate-50'
                                            }`}>
                                            <Activity className="h-4 w-4" />
                                            {patient.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsEditOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 hover:text-white backdrop-blur-sm transition-all border border-white/10"
                                >
                                    <Edit className="h-4 w-4" />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={() => setIsCreateCaseOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-white text-indigo-600 px-4 py-2.5 text-sm font-bold hover:bg-indigo-50 transition-all shadow-lg"
                                >
                                    <ClipboardList className="h-4 w-4" />
                                    New Case
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row">
                        {/* Sidebar Info */}
                        <div className="lg:w-1/3 bg-slate-50 border-r border-slate-200 p-8">
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Patient Details
                                    </h4>
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Gender</div>
                                                <div className="font-medium text-slate-900">{patient.gender || 'Unknown'}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Phone</div>
                                                <div className="font-medium text-slate-900">{patient.phone || '-'}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Email</div>
                                            <div className="font-medium text-slate-900 break-all">{patient.email || '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Address</div>
                                            <div className="font-medium text-slate-900">{patient.address || '-'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Activity className="h-4 w-4" />
                                        Clinical Information
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="text-xs text-slate-500 mb-1">Medical History</div>
                                            <div className="font-medium text-slate-900 text-sm">{patient.medical_history || 'None'}</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="text-xs text-slate-500 mb-1">Allergies</div>
                                            <div className="font-medium text-slate-900 text-sm text-red-600">{patient.allergies || 'None'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <File className="h-4 w-4" />
                                        Documents
                                    </h4>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        {patient.attachment_path ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm text-slate-900">Medical Record</div>
                                                        <div className="text-xs text-slate-500">PDF / Image</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleViewAttachment}
                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 text-center py-2">No documents attached</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="lg:w-2/3 bg-white p-8">
                            <div className="space-y-10">
                                {/* Cases Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                            <ClipboardList className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900">Cases</h2>
                                    </div>

                                    {cases.length === 0 ? (
                                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                            <ClipboardList className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                                            <p className="text-slate-500">No cases recorded for this patient</p>
                                            <button
                                                onClick={() => setIsCreateCaseOpen(true)}
                                                className="text-indigo-600 font-semibold text-sm mt-2 hover:underline"
                                            >
                                                Create a new case
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {cases.map((caseItem: any) => (
                                                <div
                                                    key={caseItem.id}
                                                    className="group p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer bg-white"
                                                    onClick={() => { setActiveCaseId(caseItem.id); setIsCaseDetailsOpen(true) }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-4">
                                                            <div className={`w-1.5 rounded-full ${normalizeCaseStatus(caseItem.status) === 'Closed' ? 'bg-slate-400' :
                                                                normalizeCaseStatus(caseItem.status) === 'Upcoming' ? 'bg-indigo-500' :
                                                                    'bg-emerald-500'
                                                                }`}></div>
                                                            <div>
                                                                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                    {caseItem.diagnosis || caseItem.admit_reason || 'Unspecified Case'}
                                                                </h3>
                                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                                    <span>Started {caseItem.started_at ? new Date(caseItem.started_at).toLocaleDateString() : 'Unknown'}</span>
                                                                    <span>-</span>
                                                                    <span className="font-medium text-slate-600">{caseItem.admit_type}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setActiveCaseId(caseItem.id); setIsCaseDetailsOpen(true) }}
                                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                                                            >
                                                                View Details
                                                            </button>
                                                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Appointments Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-violet-50 rounded-lg text-violet-600">
                                            <Calendar className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900">Appointments</h2>
                                    </div>

                                    {appointments.length === 0 ? (
                                        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                            <p className="text-sm text-slate-500">No appointments scheduled</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {appointments.map((appt: any) => (
                                                <div key={appt.id} className="flex items-center p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors">
                                                    <div className="min-w-[4rem] text-center mr-4">
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(appt.scheduled_at).toLocaleString('default', { month: 'short' })}</div>
                                                        <div className="text-xl font-bold text-slate-900">{new Date(appt.scheduled_at).getDate()}</div>
                                                    </div>
                                                    <div className="flex-1 border-l border-slate-100 pl-4">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-semibold text-slate-900">{appt.reason || 'Regular Visit'}</p>
                                                                <p className="text-sm text-slate-500">{new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                            </div>
                                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${appt.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                                                appt.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {appt.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Notes Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                            <FileText className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-xl font-bold text-slate-900">Clinical Notes</h2>
                                    </div>

                                    {notes.length === 0 ? (
                                        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                            <p className="text-sm text-slate-500">No clinical notes available</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {notes.map((note: any) => (
                                                <div key={note.id} className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100">
                                                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap text-sm">{note.note}</p>
                                                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 font-medium">
                                                        <span>
                                                            {note.appointments?.scheduled_at ? 'Visit Note' : note.cases?.started_at ? 'Case Note' : 'General Note'}
                                                        </span>
                                                        <span>-</span>
                                                        <span>{new Date(note.created_at).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Edit Modal - profile-only fields */}
            {isEditOpen && patient && (
                <PatientModal
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    patient={patient}
                    onSuccess={fetchProfile}
                    mode="profile"
                />
            )}

            {isCreateCaseOpen && (
                <CreateCaseModal
                    isOpen={isCreateCaseOpen}
                    onClose={() => setIsCreateCaseOpen(false)}
                    onSuccess={fetchProfile}
                    patientOptions={patient ? [patient] : []}
                    preselectedPatientId={patient?.id}
                />
            )}

            {isCaseDetailsOpen && (
                <CaseDetailsModal
                    isOpen={isCaseDetailsOpen}
                    onClose={() => { setIsCaseDetailsOpen(false); setActiveCaseId(null) }}
                    caseId={activeCaseId}
                    onUpdated={fetchProfile}
                />
            )}
        </div>
    )
}
