import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, FileText, Upload, Stethoscope, Calendar, Activity } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { supabase } from '../supabaseClient'

const getApiUrl = () => {
    const urlFromEnv = import.meta.env.VITE_API_URL
    return urlFromEnv !== undefined ? urlFromEnv : 'http://localhost:5000'
}

interface EditCaseModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    caseData: any
}

export default function EditCaseModal({
    isOpen,
    onClose,
    onSuccess,
    caseData,
}: EditCaseModalProps) {
    const [loading, setLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [formData, setFormData] = useState({
        status: 'Active',
        diagnosis: '',
        admit_type: 'Routine',
        admit_reason: '',
        case_started_at: '',
    })

    useEffect(() => {
        if (!isOpen || !caseData) return
        setFile(null)

        // Format started_at for datetime-local input
        let formattedDate = ''
        if (caseData.started_at) {
            const date = new Date(caseData.started_at)
            const pad = (num: number) => String(num).padStart(2, '0')
            formattedDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
        }

        setFormData({
            status: caseData.status || 'Active',
            diagnosis: caseData.diagnosis || '',
            admit_type: caseData.admit_type || 'Routine',
            admit_reason: caseData.admit_reason || '',
            case_started_at: formattedDate,
        })
    }, [isOpen, caseData])

    const handleUpload = async () => {
        if (!file) return null
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !session.user) return null
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
        if (!caseData?.id) return

        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            let attachmentPath: string | null = null
            if (file) {
                attachmentPath = await handleUpload()
            }

            const caseStartedAt = formData.case_started_at
                ? new Date(formData.case_started_at).toISOString()
                : undefined

            const payload: any = {
                status: formData.status,
                diagnosis: formData.diagnosis,
                admit_type: formData.admit_type,
                admit_reason: formData.admit_reason,
                started_at: caseStartedAt,
            }

            if (attachmentPath) {
                payload.attachment_url = attachmentPath
            }

            await axios.put(`${getApiUrl()}/api/cases/${caseData.id}`, payload, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })

            toast.success('Case updated successfully')
            onSuccess()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Failed to update case')
        } finally {
            setLoading(false)
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl">
                                {/* Gradient Header */}
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 border-b border-indigo-500 flex items-center justify-between relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Stethoscope className="h-24 w-24 text-white" />
                                    </div>
                                    <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-white flex items-center gap-2 relative z-10">
                                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                            <Stethoscope className="h-6 w-6 text-white" />
                                        </div>
                                        Edit Case
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        className="rounded-full bg-white/10 p-1.5 text-indigo-100 hover:text-white hover:bg-white/20 focus:outline-none transition-colors relative z-10"
                                        onClick={onClose}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                                    <div className="px-6 py-6 space-y-6">
                                        {/* Patient Info (Read Only) */}
                                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Patient</label>
                                            <div className="text-sm font-semibold text-slate-900">
                                                {caseData?.patients ? `${caseData.patients.first_name} ${caseData.patients.last_name}` : 'Unknown Patient'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Status */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                                                <div className="relative">
                                                    <select
                                                        className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 py-2.5 bg-slate-50 focus:bg-white transition-colors"
                                                        value={formData.status}
                                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                    >
                                                        <option value="Active">Active</option>
                                                        <option value="Upcoming">Upcoming</option>
                                                        <option value="Closed">Closed</option>
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 pr-8 flex items-center pointer-events-none">
                                                        <Activity className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Admission Type */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admission Type</label>
                                                <select
                                                    className={`block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2.5 bg-slate-50 focus:bg-white transition-colors ${formData.admit_type === 'Emergency' ? 'text-red-600 font-medium' : 'text-slate-900'
                                                        }`}
                                                    value={formData.admit_type}
                                                    onChange={(e) => setFormData({ ...formData, admit_type: e.target.value })}
                                                >
                                                    <option value="Routine">Routine</option>
                                                    <option value="Emergency">Emergency</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Date & Time */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Case Date &amp; Time</label>
                                            <div className="relative rounded-xl shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Calendar className="h-5 w-5 text-slate-400" />
                                                </div>
                                                <input
                                                    type="datetime-local"
                                                    className="block w-full rounded-xl border-slate-200 pl-10 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 py-2.5 bg-slate-50 focus:bg-white transition-colors"
                                                    value={formData.case_started_at}
                                                    onChange={(e) => setFormData({ ...formData, case_started_at: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Reason & Diagnosis */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admission Reason</label>
                                                <input
                                                    type="text"
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 py-2.5 bg-slate-50 focus:bg-white transition-colors placeholder:text-slate-400"
                                                    value={formData.admit_reason}
                                                    onChange={(e) => setFormData({ ...formData, admit_reason: e.target.value })}
                                                    placeholder="e.g. Chest pain, High fever..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Diagnosis / Notes</label>
                                                <textarea
                                                    rows={3}
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 py-2.5 bg-slate-50 focus:bg-white transition-colors placeholder:text-slate-400 resize-none"
                                                    value={formData.diagnosis}
                                                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                                                    placeholder="Detailed case notes..."
                                                />
                                            </div>
                                        </div>

                                        {/* File Upload */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Attachment (Optional)</label>
                                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-indigo-300 transition-all group">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    {file ? (
                                                        <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                                                            <FileText className="h-5 w-5" />
                                                            <span className="text-sm font-medium">{file.name}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center">
                                                            <Upload className="w-8 h-8 mb-2 text-slate-300 group-hover:text-indigo-500 transition-colors mx-auto" />
                                                            <p className="text-xs font-medium text-slate-500 group-hover:text-indigo-600">Click to upload PDF or Image</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                                            </label>
                                            {caseData?.attachment_path && !file && (
                                                <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    <span>Current file: {caseData.attachment_path.split('/').pop()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-slate-50/80 backdrop-blur-sm px-6 py-5 flex flex-row-reverse gap-3 border-t border-slate-200">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 hover:shadow-indigo-300 transition-all sm:w-auto disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {loading ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    <span>Saving...</span>
                                                </div>
                                            ) : 'Save Changes'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto transition-all"
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
            </Dialog>
        </Transition.Root>
    )
}
