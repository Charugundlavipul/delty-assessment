import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, FileText, Calendar, ClipboardList, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { supabase } from '../supabaseClient'

const getApiUrl = () => {
    const urlFromEnv = import.meta.env.VITE_API_URL
    return urlFromEnv !== undefined ? urlFromEnv : 'http://localhost:5000'
}

interface CaseDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    caseId: string | null
    onUpdated: () => void
}

export default function CaseDetailsModal({ isOpen, onClose, caseId, onUpdated }: CaseDetailsModalProps) {
    const [loading, setLoading] = useState(false)
    const [caseDetails, setCaseDetails] = useState<any>(null)
    const [noteText, setNoteText] = useState('')
    const [noteAppointmentId, setNoteAppointmentId] = useState<string>('case')
    const [isEditing, setIsEditing] = useState(false)
    const [editLoading, setEditLoading] = useState(false)
    const [editFile, setEditFile] = useState<File | null>(null)
    const [patientOptions, setPatientOptions] = useState<any[]>([])
    const [patientOptionsLoading, setPatientOptionsLoading] = useState(false)
    const [editForm, setEditForm] = useState({
        patient_id: '',
        status: 'Active',
        admit_type: 'Routine',
        admit_reason: '',
        diagnosis: '',
        started_at: '',
    })

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !session.user) return null
        return { Authorization: `Bearer ${session.access_token}` }
    }

    const toInputDateTime = (value?: string | null) => {
        if (!value) return ''
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return ''
        const pad = (num: number) => String(num).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }



    const normalizeCaseStatus = (status?: string | null) => {
        if (!status) return 'Active'
        if (['Admitted', 'Unknown', 'Stable', 'Critical', 'Discharged'].includes(status)) return 'Active'
        return status
    }

    const hydrateEditForm = (caseData: any) => {
        if (!caseData) return
        setEditForm({
            patient_id: caseData.patient_id || '',
            status: normalizeCaseStatus(caseData.status),
            admit_type: caseData.admit_type || 'Routine',
            admit_reason: caseData.admit_reason || '',
            diagnosis: caseData.diagnosis || '',
            started_at: toInputDateTime(caseData.started_at),
        })
    }

    const fetchPatientOptions = async () => {
        setPatientOptionsLoading(true)
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/patients`, {
                params: { page: 1, limit: 200, search: '' },
                headers
            })
            setPatientOptions(res.data.data || [])
        } catch (error) {
            console.error(error)
        } finally {
            setPatientOptionsLoading(false)
        }
    }

    const fetchProfile = async () => {
        if (!caseId) return
        setLoading(true)
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/cases/${caseId}`, { headers })
            setCaseDetails(res.data)
            hydrateEditForm(res.data?.case)
            setNoteAppointmentId('case')
        } catch (error) {
            console.error(error)
            toast.error('Failed to load case details')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) fetchProfile()
    }, [isOpen, caseId])

    useEffect(() => {
        if (!isOpen) {
            setIsEditing(false)
            setEditFile(null)
            return
        }
        if (patientOptions.length === 0) {
            fetchPatientOptions()
        }
    }, [isOpen])

    const handleUpload = async () => {
        if (!editFile) return null
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !session.user) return null
        const fileName = `${session.user.id}/${Date.now()}_${editFile.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
        const { error } = await supabase.storage
            .from('file_bucket')
            .upload(fileName, editFile)
        if (error) {
            console.error(error)
            toast.error('File upload failed')
            return null
        }
        return fileName
    }

    const handleSaveCase = async () => {
        if (!caseId) return
        if (!editForm.patient_id) {
            toast.error('Select a patient')
            return
        }
        setEditLoading(true)
        try {
            const headers = await getAuthHeaders()
            if (!headers) return

            let attachmentPath: string | null = null
            if (editFile) {
                attachmentPath = await handleUpload()
            }

            const startedAt = editForm.started_at
                ? new Date(editForm.started_at).toISOString()
                : undefined



            const payload: any = {
                patient_id: editForm.patient_id,
                status: editForm.status,
                admit_type: editForm.admit_type,
                admit_reason: editForm.admit_reason,
                diagnosis: editForm.diagnosis,
                started_at: startedAt,
            }
            if (attachmentPath) {
                payload.attachment_url = attachmentPath
            }

            await axios.put(`${getApiUrl()}/api/cases/${caseId}`, payload, { headers })
            toast.success('Case updated')
            setIsEditing(false)
            setEditFile(null)
            fetchProfile()
            onUpdated()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update case')
        } finally {
            setEditLoading(false)
        }
    }

    const handleCancelEdit = () => {
        hydrateEditForm(caseDetails?.case)
        setEditFile(null)
        setIsEditing(false)
    }

    const handleDeleteCase = async () => {
        if (!caseId) return
        if (!confirm('Delete this case? Notes will be removed and appointments will be unlinked.')) return
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            await axios.delete(`${getApiUrl()}/api/cases/${caseId}`, { headers })
            toast.success('Case deleted')
            onUpdated()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Failed to delete case')
        }
    }

    const handleAddNote = async () => {
        if (!caseId || !noteText.trim()) {
            toast.error('Write a note first')
            return
        }
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const payload: any = { note: noteText.trim() }
            if (noteAppointmentId !== 'case') {
                payload.appointment_id = noteAppointmentId
            }
            await axios.post(`${getApiUrl()}/api/cases/${caseId}/notes`, payload, { headers })
            setNoteText('')
            setNoteAppointmentId('case')
            fetchProfile()
            onUpdated()
            toast.success('Case note added')
        } catch (error) {
            console.error(error)
            toast.error('Failed to add note')
        }
    }

    const handleViewAttachment = async () => {
        if (!caseId) return
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/cases/${caseId}/attachment`, { headers })
            window.open(res.data.url, '_blank', 'noopener,noreferrer')
        } catch (error) {
            console.error(error)
            toast.error('Unable to open attachment')
        }
    }

    const caseData = caseDetails?.case
    const patient = caseData?.patients
    const appointments = caseDetails?.appointments || []
    const notes = caseDetails?.notes || []
    const displayCaseStatus = normalizeCaseStatus(caseData?.status)
    const patientOptionList = (() => {
        const list = [...patientOptions]
        if (patient && !list.some((option) => option.id === patient.id)) {
            list.unshift({
                id: patient.id,
                first_name: patient.first_name,
                last_name: patient.last_name,
                status: patient.status,
            })
        }
        return list
    })()

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
                                        Case Details
                                    </Dialog.Title>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isEditing) {
                                                    handleCancelEdit()
                                                } else {
                                                    setIsEditing(true)
                                                    if (patientOptions.length === 0) {
                                                        fetchPatientOptions()
                                                    }
                                                }
                                            }}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            {isEditing ? 'Cancel edit' : 'Edit case'}
                                        </button>
                                        {displayCaseStatus !== 'Closed' && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!confirm('Mark this case as Closed?')) return
                                                    try {
                                                        const headers = await getAuthHeaders()
                                                        if (!headers) return
                                                        await axios.put(`${getApiUrl()}/api/cases/${caseId}`, { status: 'Closed' }, { headers })
                                                        toast.success('Case closed')
                                                        fetchProfile()
                                                        onUpdated()
                                                    } catch (error) {
                                                        console.error(error)
                                                        toast.error('Failed to close case')
                                                    }
                                                }}
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                            >
                                                Close Case
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleDeleteCase}
                                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-md bg-transparent text-slate-400 hover:text-slate-500 focus:outline-none"
                                            onClick={onClose}
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="px-6 py-6">
                                    {loading || !caseData || !patient ? (
                                        <div className="text-sm text-slate-500">Loading case...</div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            <div className="lg:col-span-1 space-y-4">
                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <p className="text-sm font-semibold text-slate-900">{patient.first_name} {patient.last_name}</p>
                                                    <p className="text-xs text-slate-500">DOB: {patient.dob}</p>
                                                    <p className="text-xs text-slate-500">Status: {displayCaseStatus}</p>
                                                    <p className="text-xs text-slate-500">Admission: {caseData.admit_type || 'Routine'}</p>
                                                    {caseData.started_at && (
                                                        <p className="text-xs text-slate-500">Case started: {new Date(caseData.started_at).toLocaleString()}</p>
                                                    )}
                                                    {caseData.admit_reason && (
                                                        <p className="text-xs text-slate-500">Reason: {caseData.admit_reason}</p>
                                                    )}
                                                </div>

                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <p className="text-sm font-semibold text-slate-900 mb-2">Attachment</p>
                                                    {caseData.attachment_path ? (
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
                                                </div>

                                                {caseData.admit_type === 'Emergency' && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                        <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            Emergency case
                                                        </div>
                                                        <p className="text-xs text-amber-700 mt-1">Add case notes for emergency details.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="lg:col-span-2 space-y-6">
                                                {isEditing && (
                                                    <div className="rounded-xl border border-slate-200 p-4">
                                                        <p className="text-sm font-semibold text-slate-900 mb-3">Edit Case</p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div className="sm:col-span-2">
                                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Patient</label>
                                                                <select
                                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 w-full"
                                                                    value={editForm.patient_id}
                                                                    onChange={(e) => {
                                                                        const selectedId = e.target.value
                                                                        setEditForm({
                                                                            ...editForm,
                                                                            patient_id: selectedId,
                                                                        })
                                                                    }}
                                                                    disabled={patientOptionsLoading}
                                                                >
                                                                    <option value="">
                                                                        {patientOptionsLoading ? 'Loading patients...' : 'Select a patient...'}
                                                                    </option>
                                                                    {patientOptionList.map((patientOption) => (
                                                                        <option key={patientOption.id} value={patientOption.id}>
                                                                            {patientOption.first_name} {patientOption.last_name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                                                                <select
                                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 w-full"
                                                                    value={editForm.status}
                                                                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                                                >
                                                                    <option value="Active">Active</option>
                                                                    <option value="Upcoming">Upcoming</option>
                                                                    <option value="Closed">Closed</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Admission Type</label>
                                                                <select
                                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 w-full"
                                                                    value={editForm.admit_type}
                                                                    onChange={(e) => setEditForm({ ...editForm, admit_type: e.target.value })}
                                                                >
                                                                    <option value="Routine">Routine</option>
                                                                    <option value="Emergency">Emergency</option>
                                                                </select>
                                                            </div>
                                                            <div className="sm:col-span-2">
                                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Admission Reason</label>
                                                                <input
                                                                    type="text"
                                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 w-full"
                                                                    value={editForm.admit_reason}
                                                                    onChange={(e) => setEditForm({ ...editForm, admit_reason: e.target.value })}
                                                                    placeholder="e.g. Chest pain, High fever..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Case Date & Time</label>
                                                                <input
                                                                    type="datetime-local"
                                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 w-full"
                                                                    value={editForm.started_at}
                                                                    onChange={(e) => setEditForm({ ...editForm, started_at: e.target.value })}
                                                                    placeholder="dd-mm-yyyy --:--"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Attachment</label>
                                                                <input
                                                                    type="file"
                                                                    className="block w-full text-xs text-slate-600"
                                                                    onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                                                                />
                                                                {caseData?.attachment_path && !editFile && (
                                                                    <p className="text-xs text-slate-500 mt-1">Current file: {caseData.attachment_path.split('/').pop()}</p>
                                                                )}
                                                            </div>
                                                            <div className="sm:col-span-2">
                                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Diagnosis / Notes</label>
                                                                <textarea
                                                                    rows={3}
                                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 w-full"
                                                                    value={editForm.diagnosis}
                                                                    onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                                                                    placeholder="Detailed case notes..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end gap-2 mt-4">
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelEdit}
                                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleSaveCase}
                                                                disabled={editLoading}
                                                                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                                                            >
                                                                {editLoading ? 'Saving...' : 'Save changes'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {appointments.length > 0 && (
                                                    <div className="rounded-xl border border-slate-200">
                                                        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-indigo-600" />
                                                            <p className="text-sm font-semibold text-slate-900">Appointments</p>
                                                        </div>
                                                        <div className="divide-y divide-slate-200">
                                                            {appointments.map((appt: any) => (
                                                                <div key={appt.id} className="p-4 text-sm">
                                                                    <p className="font-semibold text-slate-900">{new Date(appt.scheduled_at).toLocaleString()}</p>
                                                                    <p className="text-xs text-slate-500">{appt.reason || 'No reason'} - {appt.status}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <p className="text-sm font-semibold text-slate-900 mb-3">Add Case Note</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                                        <select
                                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                                                            value={noteAppointmentId}
                                                            onChange={(e) => setNoteAppointmentId(e.target.value)}
                                                        >
                                                            <option value="case">Case note</option>
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
                                                            placeholder="Write case note..."
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
                                                        <p className="text-sm font-semibold text-slate-900">Case Notes</p>
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
                                                                            : 'Case note'}
                                                                        {' - '}
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
