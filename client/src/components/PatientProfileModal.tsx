import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, FileText, Calendar, ClipboardList, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { supabase } from '../supabaseClient'

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
    const [noteText, setNoteText] = useState('')
    const [noteAppointmentId, setNoteAppointmentId] = useState<string>('emergency')
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

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
            setNoteAppointmentId('emergency')
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

    const handleAddNote = async () => {
        if (!patientId || !noteText.trim()) {
            toast.error('Write a note first')
            return
        }
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const payload: any = { note: noteText.trim() }
            if (noteAppointmentId !== 'emergency') {
                payload.appointment_id = noteAppointmentId
            }
            await axios.post(`${getApiUrl()}/api/patients/${patientId}/notes`, payload, { headers })
            setNoteText('')
            setNoteAppointmentId('emergency')
            fetchProfile()
            onUpdated()
            toast.success('Note added')
        } catch (error) {
            console.error(error)
            toast.error('Failed to add note')
        }
    }

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
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-5xl">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-slate-900 flex items-center gap-2">
                                        <ClipboardList className="h-5 w-5 text-indigo-600" />
                                        Patient Profile
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        className="rounded-md bg-transparent text-slate-400 hover:text-slate-500 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="px-6 py-6">
                                    {loading || !patient ? (
                                        <div className="text-sm text-slate-500">Loading profile...</div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className="lg:col-span-1 space-y-4">
                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <p className="text-sm font-semibold text-slate-900">{patient.first_name} {patient.last_name}</p>
                                                    <p className="text-xs text-slate-500">DOB: {patient.dob}</p>
                                                    <p className="text-xs text-slate-500">Status: {patient.status}</p>
                                                    <p className="text-xs text-slate-500">Admission: {patient.admit_type || 'Routine'}</p>
                                                    {patient.admit_reason && (
                                                        <p className="text-xs text-slate-500">Reason: {patient.admit_reason}</p>
                                                    )}
                                                </div>

                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <p className="text-sm font-semibold text-slate-900 mb-2">Attachment</p>
                                                    {patient.attachment_path ? (
                                                        <button
                                                            type="button"
                                                            onClick={handleViewAttachment}
                                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                        >
                                                            <FileText className="h-3.5 w-3.5" />
                                                            View attachment
                                                        </button>
                                                    ) : (
                                                        <p className="text-xs text-slate-500">No attachment yet</p>
                                                    )}
                                                    <div className="mt-3">
                                                        <input type="file" onChange={e => setAttachmentFile(e.target.files?.[0] || null)} />
                                                        <button
                                                            type="button"
                                                            onClick={handleUploadAttachment}
                                                            className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                                                        >
                                                            Upload attachment
                                                        </button>
                                                    </div>
                                                </div>

                                                {patient.admit_type === 'Emergency' && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                        <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            Emergency admit
                                                        </div>
                                                        <p className="text-xs text-amber-700 mt-1">Add visit notes below for this emergency case.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="lg:col-span-2 space-y-6">
                                                <div className="rounded-xl border border-slate-200">
                                                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-indigo-600" />
                                                        <p className="text-sm font-semibold text-slate-900">Appointments</p>
                                                    </div>
                                                    {appointments.length === 0 ? (
                                                        <div className="p-4 text-xs text-slate-500">No appointments yet.</div>
                                                    ) : (
                                                        <div className="divide-y divide-slate-200">
                                                            {appointments.map((appt: any) => (
                                                                <div key={appt.id} className="p-4 text-sm">
                                                                    <p className="font-semibold text-slate-900">{new Date(appt.scheduled_at).toLocaleString()}</p>
                                                                    <p className="text-xs text-slate-500">{appt.reason || 'No reason'} • {appt.status}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <p className="text-sm font-semibold text-slate-900 mb-3">Add Visit Note</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                                        <select
                                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                                                            value={noteAppointmentId}
                                                            onChange={(e) => setNoteAppointmentId(e.target.value)}
                                                        >
                                                            <option value="emergency">Emergency admit</option>
                                                            {appointments.map((appt: any) => (
                                                                <option key={appt.id} value={appt.id}>
                                                                    Appointment: {new Date(appt.scheduled_at).toLocaleDateString()}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <textarea
                                                            rows={2}
                                                            className="sm:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                                                            value={noteText}
                                                            onChange={(e) => setNoteText(e.target.value)}
                                                            placeholder="Write visit note..."
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddNote}
                                                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                                                    >
                                                        Save note
                                                    </button>
                                                </div>

                                                <div className="rounded-xl border border-slate-200">
                                                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-indigo-600" />
                                                        <p className="text-sm font-semibold text-slate-900">Visit Notes</p>
                                                    </div>
                                                    {notes.length === 0 ? (
                                                        <div className="p-4 text-xs text-slate-500">No notes yet.</div>
                                                    ) : (
                                                        <div className="divide-y divide-slate-200">
                                                            {notes.map((note: any) => (
                                                                <div key={note.id} className="p-4">
                                                                    <p className="text-sm text-slate-900">{note.note}</p>
                                                                    <p className="text-xs text-slate-500 mt-1">
                                                                        {note.appointments?.scheduled_at
                                                                            ? `Appointment ${new Date(note.appointments.scheduled_at).toLocaleString()}`
                                                                            : 'Emergency admit'}
                                                                        {' • '}
                                                                        {new Date(note.created_at).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}
