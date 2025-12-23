import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Upload, FileText, User, Stethoscope } from 'lucide-react'
import { supabase } from '../supabaseClient'
import axios from 'axios'
import toast from 'react-hot-toast'

// Helper to get API URL
const getApiUrl = () => {
    const urlFromEnv = import.meta.env.VITE_API_URL
    return urlFromEnv !== undefined ? urlFromEnv : 'http://localhost:5000'
}

interface PatientModalProps {
    isOpen: boolean
    onClose: () => void
    patient?: any
    onSuccess: () => void
    preset?: {
        admit_type?: 'Emergency' | 'Routine'
    }
    mode?: 'create' | 'edit' | 'admit' | 'profile'
}

export default function PatientModal({ isOpen, onClose, patient, onSuccess, preset, mode = 'edit' }: PatientModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dob: '',
        gender: 'Unknown',
        phone: '',
        email: '',
        address: '',

        diagnosis: '',
        medical_history: '',
        allergies: '',
        attachment_url: '',
        admit_type: 'Routine',
        admit_reason: ''
    })
    const [file, setFile] = useState<File | null>(null)

    useEffect(() => {
        if (patient) {
            setFormData({
                first_name: patient.first_name,
                last_name: patient.last_name,
                dob: patient.dob ? patient.dob.split('T')[0] : '',
                gender: patient.gender || 'Unknown',
                phone: patient.phone || '',
                email: patient.email || '',
                address: patient.address || '',

                diagnosis: patient.diagnosis || '',
                medical_history: patient.medical_history || '',
                allergies: patient.allergies || '',
                attachment_url: patient.attachment_path || '',
                admit_type: patient.admit_type || 'Routine',
                admit_reason: patient.admit_reason || ''
            })
        } else {
            // Reset form for new patient
            setFormData({
                first_name: '',
                last_name: '',
                dob: '',
                gender: 'Unknown',
                phone: '',
                email: '',
                address: '',

                diagnosis: '',
                medical_history: '',
                allergies: '',
                attachment_url: '',
                admit_type: preset?.admit_type || 'Routine',
                admit_reason: ''
            })
            setFile(null)
        }
    }, [patient, isOpen, preset, mode])

    const handleUpload = async () => {
        if (!file) return null

        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !session.user) return null

        // Unique filename: user_id/timestamp_filename
        const fileName = `${session.user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`
        const { error } = await supabase.storage
            .from('file_bucket')
            .upload(fileName, file)

        if (error) {
            console.error(error)
            toast.error('File upload failed')
            return null
        }

        return fileName
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            let attachmentPath = formData.attachment_url
            if (file) {
                const path = await handleUpload()
                if (path) attachmentPath = path
            }

            let payload: any = { ...formData, attachment_url: attachmentPath }
            if (!payload.email) delete payload.email
            if (mode === 'profile') {
                payload = {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    dob: formData.dob,
                }
            } else if (mode === 'create') {
                // Remove admission fields to prevent auto-creation of case
                delete payload.admit_type
                delete payload.admit_reason
                delete payload.diagnosis
                delete payload.attachment_url // Unless we want to allow attachment on creation? The UI hides it for create mode but check line 359
                // Line 359 says mode !== 'create' && mode !== 'profile' for attachment. So it is hidden.
                delete payload.attachment_url
            }
            if (patient) {
                await axios.put(`${getApiUrl()}/api/patients/${patient.id}`, payload, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                })
                toast.success('Patient record updated')
            } else {
                await axios.post(`${getApiUrl()}/api/patients`, payload, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                })
                toast.success(mode === 'create' ? 'Patient created successfully' : 'Patient admitted successfully')
            }
            onSuccess()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Operation failed')
        } finally {
            setLoading(false)
        }
    }

    const handleViewAttachment = async () => {
        if (!patient?.id || !patient?.attachment_path) return
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return
            const res = await axios.get(`${getApiUrl()}/api/patients/${patient.id}/attachment`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
            window.open(res.data.url, '_blank', 'noopener,noreferrer')
        } catch (error) {
            console.error(error)
            toast.error('Unable to open attachment')
        }
    }

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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
                                {/* Header */}
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-slate-900 flex items-center gap-2">
                                        <div className="bg-indigo-100 p-1.5 rounded-lg">
                                            {patient ? <Stethoscope className="h-5 w-5 text-indigo-600" /> : <User className="h-5 w-5 text-indigo-600" />}
                                        </div>
                                        {patient ? (mode === 'profile' ? 'Edit Patient Profile' : mode === 'admit' ? 'Create Case' : 'Update Medical Record') : (mode === 'create' ? 'Create Patient' : 'Admit New Patient')}
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        className="rounded-md bg-transparent text-slate-400 hover:text-slate-500 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Body */}
                                <form onSubmit={handleSubmit}>
                                    <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">First Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 bg-slate-50 min-h-[42px]" // Ensure visible input
                                                    value={formData.first_name}
                                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Last Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 bg-slate-50 min-h-[42px]"
                                                    value={formData.last_name}
                                                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className={`grid grid-cols-2 gap-5 ${mode === 'create' || mode === 'profile' ? 'sm:grid-cols-1' : ''}`}>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    required
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 bg-slate-50 min-h-[42px]"
                                                    value={formData.dob}
                                                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
                                                <select
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 bg-slate-50 min-h-[42px]"
                                                    value={formData.gender}
                                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                                >
                                                    <option value="Unknown">Select...</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div className="col-span-1">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                                                <input
                                                    type="tel"
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 bg-slate-50 min-h-[42px]"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                                                <input
                                                    type="email"
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 bg-slate-50 min-h-[42px]"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="patient@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
                                            <input
                                                type="text"
                                                className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 bg-slate-50 min-h-[42px]"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="123 Main St, City, State"
                                            />
                                        </div>

                                        <div className="border-t border-slate-100 pt-5"></div>

                                        {mode !== 'create' && mode !== 'profile' && (
                                            <div className="grid grid-cols-2 gap-5">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Admission Type</label>
                                                    <select
                                                        className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 bg-slate-50 min-h-[42px]"
                                                        value={formData.admit_type}
                                                        onChange={e => setFormData({ ...formData, admit_type: e.target.value })}
                                                    >
                                                        <option value="Routine">Routine</option>
                                                        <option value="Emergency">Emergency</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Admission Reason</label>
                                                    <input
                                                        type="text"
                                                        className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2.5 bg-slate-50 min-h-[42px]"
                                                        value={formData.admit_reason}
                                                        onChange={e => setFormData({ ...formData, admit_reason: e.target.value })}
                                                        placeholder="Short reason"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {mode !== 'create' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Medical Diagnosis / Notes</label>
                                                <textarea
                                                    rows={4}
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-50 p-3"
                                                    placeholder="Enter clinical notes here..."
                                                    value={formData.diagnosis}
                                                    onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Medical History</label>
                                                <textarea
                                                    rows={3}
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-50 p-3"
                                                    placeholder="Past conditions, surgeries..."
                                                    value={formData.medical_history}
                                                    onChange={e => setFormData({ ...formData, medical_history: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Allergies</label>
                                                <textarea
                                                    rows={3}
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-slate-50 p-3"
                                                    placeholder="e.g. Penicillin, Peanuts"
                                                    value={formData.allergies}
                                                    onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {mode !== 'create' && mode !== 'profile' && (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Attachment (Optional)</label>
                                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        {file ? (
                                                            <div className="flex items-center gap-2 text-indigo-600">
                                                                <FileText className="h-5 w-5" />
                                                                <span className="text-sm font-medium">{file.name}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center">
                                                                <Upload className="w-6 h-6 mb-1 text-slate-400 mx-auto" />
                                                                <p className="text-xs text-slate-500">Upload PDF or Image</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                                                </label>
                                                {patient && patient.attachment_path && !file && (
                                                    <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                                        <FileText className="h-3 w-3" /> Existing file: {patient.attachment_path.split('/').pop()}
                                                    </p>
                                                )}
                                                {patient && patient.attachment_path && (
                                                    <button
                                                        type="button"
                                                        onClick={handleViewAttachment}
                                                        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <FileText className="h-3.5 w-3.5" />
                                                        View attachment
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-slate-100">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:w-auto transition-colors disabled:opacity-50"
                                        >
                                            {loading ? 'Saving...' : 'Save Record'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-colors"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog >
        </Transition.Root >
    )
}
