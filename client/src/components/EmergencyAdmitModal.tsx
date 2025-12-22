import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, AlertTriangle, FileText, Upload } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { supabase } from '../supabaseClient'

const getApiUrl = () => {
    const urlFromEnv = import.meta.env.VITE_API_URL
    return urlFromEnv !== undefined ? urlFromEnv : 'http://localhost:5000'
}

interface EmergencyAdmitModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    patientOptions: any[]
}

export default function EmergencyAdmitModal({ isOpen, onClose, onSuccess, patientOptions }: EmergencyAdmitModalProps) {
    const [loading, setLoading] = useState(false)
    const [useExisting, setUseExisting] = useState(true)
    const [existingId, setExistingId] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        dob: '',
        admit_reason: '',
    })

    useEffect(() => {
        if (!isOpen) return
        setUseExisting(true)
        setExistingId('')
        setFile(null)
        setFormData({ first_name: '', last_name: '', dob: '', admit_reason: '' })
    }, [isOpen])

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
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            let attachmentPath: string | null = null
            if (file) {
                attachmentPath = await handleUpload()
            }

            if (useExisting && existingId) {
                await axios.put(`${getApiUrl()}/api/patients/${existingId}`, {
                    status: 'Critical',
                    admit_type: 'Emergency',
                    admit_reason: formData.admit_reason,
                    attachment_url: attachmentPath || undefined,
                }, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                })
                toast.success('Emergency admit updated')
            } else {
                await axios.post(`${getApiUrl()}/api/patients`, {
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    dob: formData.dob,
                    status: 'Critical',
                    admit_type: 'Emergency',
                    admit_reason: formData.admit_reason,
                    attachment_url: attachmentPath || undefined,
                }, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                })
                toast.success('Emergency admit created')
            }

            onSuccess()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Emergency admit failed')
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
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-slate-900 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                        Emergency Admit
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        className="rounded-md bg-transparent text-slate-400 hover:text-slate-500 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="px-6 py-6 space-y-5">
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setUseExisting(true)}
                                                className={`px-3 py-2 rounded-full text-xs font-semibold ${useExisting ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                                            >
                                                Admit existing
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setUseExisting(false); setExistingId('') }}
                                                className={`px-3 py-2 rounded-full text-xs font-semibold ${!useExisting ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                                            >
                                                Create new
                                            </button>
                                        </div>

                                        {useExisting ? (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Patient</label>
                                                <select
                                                    className="block w-full"
                                                    value={existingId}
                                                    onChange={(e) => setExistingId(e.target.value)}
                                                    required
                                                >
                                                    <option value="">Choose patient</option>
                                                    {patientOptions.map((p) => (
                                                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-5">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">First Name</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={formData.first_name}
                                                            onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Last Name</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={formData.last_name}
                                                            onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date of Birth</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={formData.dob}
                                                        onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Admission Reason</label>
                                            <input
                                                type="text"
                                                value={formData.admit_reason}
                                                onChange={e => setFormData({ ...formData, admit_reason: e.target.value })}
                                                placeholder="Short reason"
                                            />
                                        </div>

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
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-slate-100">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex w-full justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:w-auto disabled:opacity-50"
                                        >
                                            {loading ? 'Saving...' : 'Admit Emergency'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto"
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
