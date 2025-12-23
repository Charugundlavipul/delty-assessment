import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, FileText, Calendar, User, Clock, Activity, MapPin, File, Edit } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { supabase } from '../supabaseClient'
import PatientModal from './PatientModal'

// Helper to get API URL
const getApiUrl = () => {
    const urlFromEnv = import.meta.env.VITE_API_URL
    return urlFromEnv !== undefined ? urlFromEnv : 'http://localhost:5000'
}

interface PatientProfileModalProps {
    isOpen: boolean
    onClose: () => void
    patientId: string | null
    onUpdated: () => void
}

export default function PatientProfileModal({ isOpen, onClose, patientId, onUpdated }: PatientProfileModalProps) {
    const [loading, setLoading] = useState(false)
    const [profile, setProfile] = useState<any>(null)
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !session.user) return null
        return { Authorization: `Bearer ${session.access_token}` }
    }

    const fetchProfile = async () => {
        if (!patientId) return
        setLoading(true)
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/patients/${patientId}/profile`, { headers })
            setProfile(res.data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load patient profile')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) fetchProfile()
    }, [isOpen, patientId])

    const handleViewAttachment = async () => {
        if (!patientId) return
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/patients/${patientId}/attachment`, { headers })
            window.open(res.data.url, '_blank', 'noopener,noreferrer')
        } catch (error) {
            console.error(error)
            toast.error('Unable to open attachment')
        }
    }

    const handleUploadAttachment = async () => {
        if (!patientId || !attachmentFile) {
            toast.error('Choose a file first')
            return
        }
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const fileName = `${session.user.id}/${Date.now()}_${attachmentFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
            const { error } = await supabase.storage
                .from('file_bucket')
                .upload(fileName, attachmentFile)

            if (error) throw error

            const headers = { Authorization: `Bearer ${session.access_token}` }
            await axios.put(`${getApiUrl()}/api/patients/${patientId}`, { attachment_url: fileName }, { headers })
            setAttachmentFile(null)
            fetchProfile()
            onUpdated()
            toast.success('Attachment saved')
        } catch (error) {
            console.error(error)
            toast.error('Attachment upload failed')
        }
    }

    const patient = profile?.patient
    const appointments = profile?.appointments || []
    const notes = profile?.notes || []

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                                {loading || !patient ? (
                                    <div className="p-12 flex justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Gradient Header */}
                                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-8 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Activity className="h-48 w-48 text-white" />
                                            </div>
                                            <div className="relative z-10 flex items-start justify-between">
                                                <div className="flex items-center gap-6">
                                                    <div className="h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 text-white text-3xl font-bold">
                                                        {patient.first_name[0]}{patient.last_name[0]}
                                                    </div>
                                                    <div className="text-white">
                                                        <h3 className="text-3xl font-bold">{patient.first_name} {patient.last_name}</h3>
                                                        <div className="flex items-center gap-4 mt-2 text-emerald-50 font-medium">
                                                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-md">
                                                                <Clock className="h-4 w-4" />
                                                                {new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs
                                                            </span>
                                                            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-sm backdrop-blur-md">
                                                                <MapPin className="h-4 w-4" />
                                                                {patient.admit_type || 'Routine'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 hover:text-white focus:outline-none transition-colors mr-2"
                                                    onClick={() => setIsEditModalOpen(true)}
                                                    title="Edit Profile"
                                                >
                                                    <Edit className="h-6 w-6" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 hover:text-white focus:outline-none transition-colors"
                                                    onClick={onClose}
                                                >
                                                    <X className="h-6 w-6" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col lg:flex-row h-[600px]">
                                            {/* Sidebar Info */}
                                            <div className="lg:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Patient Details</h4>
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 mb-6">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <div className="text-xs text-slate-500 mb-0.5">Gender</div>
                                                                    <div className="font-medium text-slate-900 text-sm">{patient.gender || 'Unknown'}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-slate-500 mb-0.5">Phone</div>
                                                                    <div className="font-medium text-slate-900 text-sm">{patient.phone || '-'}</div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-slate-500 mb-0.5">Email</div>
                                                                <div className="font-medium text-slate-900 text-sm break-all">{patient.email || '-'}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs text-slate-500 mb-0.5">Address</div>
                                                                <div className="font-medium text-slate-900 text-sm">{patient.address || '-'}</div>
                                                            </div>
                                                        </div>

                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Clinical Information</h4>
                                                        <div className="space-y-3">
                                                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                                <div className="text-xs text-slate-500 mb-1">Medical History</div>
                                                                <div className="font-medium text-slate-900 text-sm">{patient.medical_history || 'None'}</div>
                                                            </div>
                                                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                                <div className="text-xs text-slate-500 mb-1">Allergies</div>
                                                                <div className="font-medium text-slate-900 text-sm text-red-600">{patient.allergies || 'None'}</div>
                                                            </div>
                                                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                                <div className="text-xs text-slate-500 mb-1">Current Status</div>
                                                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                                                                    ${patient.status === 'Critical' ? 'bg-red-100 text-red-800' :
                                                                        patient.status === 'Stable' ? 'bg-green-100 text-green-800' :
                                                                            'bg-slate-100 text-slate-700'}`}>
                                                                    {patient.status}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Medical Records</h4>
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                                            {patient.attachment_path ? (
                                                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                                                            <File className="h-5 w-5" />
                                                                        </div>
                                                                        <div className="text-sm">
                                                                            <div className="font-medium text-slate-900">Attachment</div>
                                                                            <div className="text-xs text-slate-500">View file</div>
                                                                        </div>
                                                                    </div>
                                                                    <button
                                                                        onClick={handleViewAttachment}
                                                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                                                    >
                                                                        View
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-slate-500 text-center py-2">No files attached</div>
                                                            )}

                                                            <div>
                                                                <label className="block text-xs text-slate-500 mb-2 font-medium">Upload New Record</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="file"
                                                                        className="block w-full text-xs text-slate-500
                                                                            file:mr-4 file:py-2 file:px-4
                                                                            file:rounded-full file:border-0
                                                                            file:text-xs file:font-semibold
                                                                            file:bg-indigo-50 file:text-indigo-700
                                                                            hover:file:bg-indigo-100"
                                                                        onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                                                                    />
                                                                </div>
                                                                {attachmentFile && (
                                                                    <button
                                                                        onClick={handleUploadAttachment}
                                                                        className="mt-3 w-full bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-500 transition-colors"
                                                                    >
                                                                        Upload Selected File
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Main Content */}
                                            <div className="lg:w-2/3 bg-white p-6 overflow-y-auto">
                                                <div className="mb-8">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Calendar className="h-5 w-5 text-indigo-600" />
                                                        <h2 className="text-lg font-bold text-slate-900">Appointments</h2>
                                                    </div>
                                                    {appointments.length === 0 ? (
                                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                                            <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                                            <p className="text-sm text-slate-500">No appointments scheduled</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-3">
                                                            {appointments.map((appt: any) => (
                                                                <div key={appt.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow group">
                                                                    <div className="flex gap-4">
                                                                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                            <span className="text-xs font-bold uppercase">{new Date(appt.scheduled_at).toLocaleString('default', { month: 'short' })}</span>
                                                                            <span className="text-lg font-bold">{new Date(appt.scheduled_at).getDate()}</span>
                                                                        </div>
                                                                        <div>
                                                                            <h5 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h5>
                                                                            <p className="text-sm text-slate-500">{appt.reason || 'Regular Checkup'}</p>
                                                                        </div>
                                                                    </div>
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                                                                        ${appt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                                            appt.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                                                'bg-blue-100 text-blue-700'}`}>
                                                                        {appt.status}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <FileText className="h-5 w-5 text-indigo-600" />
                                                        <h2 className="text-lg font-bold text-slate-900">Medical Notes</h2>
                                                    </div>
                                                    {notes.length === 0 ? (
                                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                                            <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                                            <p className="text-sm text-slate-500">No medical notes recorded</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {notes.map((note: any) => (
                                                                <div key={note.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                                                                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{note.note}</p>
                                                                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                                                                        <span className="flex items-center gap-1">
                                                                            <User className="h-3 w-3" />
                                                                            Attending Physician
                                                                        </span>
                                                                        <span className="font-medium">
                                                                            {new Date(note.created_at).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <PatientModal
                                            isOpen={isEditModalOpen}
                                            onClose={() => setIsEditModalOpen(false)}
                                            patient={patient}
                                            mode="edit"
                                            onSuccess={() => {
                                                setIsEditModalOpen(false)
                                                fetchProfile()
                                                onUpdated()
                                            }}
                                        />
                                    </>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root >
    )
}
