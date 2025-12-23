import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Stethoscope, Camera, User } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { supabase } from '../supabaseClient'

const getApiUrl = () => {
    const urlFromEnv = import.meta.env.VITE_API_URL
    return urlFromEnv !== undefined ? urlFromEnv : 'http://localhost:5000'
}

interface DoctorProfileModalProps {
    isOpen: boolean
    onClose: () => void
    onSaved: () => void
}

export default function DoctorProfileModal({ isOpen, onClose, onSaved }: DoctorProfileModalProps) {
    const [loading, setLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        display_name: '',
        title: '',
        department: '',
        avatar_url: '',
    })

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !session.user) return null
        return { Authorization: `Bearer ${session.access_token}` }
    }

    const loadProfile = async () => {
        setLoading(true)
        try {
            const headers = await getAuthHeaders()
            if (!headers) return
            const res = await axios.get(`${getApiUrl()}/api/doctors/me`, { headers })
            if (res.data.profile) {
                setFormData({
                    display_name: res.data.profile.display_name || '',
                    title: res.data.profile.title || '',
                    department: res.data.profile.department || '',
                    avatar_url: res.data.profile.avatar_url || '',
                })
                if (res.data.profile.avatar_url) {
                    const { data } = supabase.storage.from('file_bucket').getPublicUrl(res.data.profile.avatar_url)
                    setAvatarPreview(data.publicUrl)
                } else {
                    setAvatarPreview(null)
                }
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            loadProfile()
            setFile(null)
        }
    }, [isOpen])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            setAvatarPreview(URL.createObjectURL(selectedFile))
        }
    }

    const handleUpload = async () => {
        if (!file) return null
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !session.user) return null

        const fileName = `avatars/${session.user.id}_${Date.now()}`
        const { error } = await supabase.storage
            .from('file_bucket')
            .upload(fileName, file, { upsert: true })

        if (error) {
            console.error(error)
            toast.error('Avatar upload failed')
            return null
        }
        return fileName
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const headers = await getAuthHeaders()
            if (!headers) return

            let avatarPath = formData.avatar_url
            if (file) {
                const uploadedPath = await handleUpload()
                if (uploadedPath) avatarPath = uploadedPath
            }

            await axios.put(`${getApiUrl()}/api/doctors/me`, {
                ...formData,
                avatar_url: avatarPath
            }, { headers })

            toast.success('Profile updated')
            onSaved()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error('Failed to save profile')
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                {/* Gradient Header */}
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-6 border-b border-indigo-500 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Stethoscope className="h-32 w-32 text-white" />
                                    </div>
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="relative group">
                                            <div className="h-24 w-24 rounded-full bg-white p-1 shadow-lg overflow-hidden">
                                                {avatarPreview ? (
                                                    <img src={avatarPreview} alt="Profile" className="h-full w-full rounded-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full rounded-full bg-indigo-50 flex items-center justify-center">
                                                        <User className="h-10 w-10 text-indigo-300" />
                                                    </div>
                                                )}
                                            </div>
                                            <label className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 text-white shadow-lg cursor-pointer hover:bg-indigo-500 transition-colors border-2 border-white">
                                                <Camera className="h-4 w-4" />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                        </div>
                                        <Dialog.Title as="h3" className="mt-4 text-xl font-bold text-white">
                                            {formData.display_name || 'Doctor Profile'}
                                        </Dialog.Title>
                                        <p className="text-indigo-200 text-sm">{formData.title || 'Update your details'}</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="absolute top-4 right-4 rounded-full bg-white/10 p-1.5 text-indigo-100 hover:text-white hover:bg-white/20 focus:outline-none transition-colors"
                                        onClick={onClose}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSave} className="flex flex-col h-full">
                                    <div className="px-6 py-6 space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Display Name</label>
                                            <input
                                                type="text"
                                                className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 py-2.5 bg-slate-50 focus:bg-white transition-colors"
                                                value={formData.display_name}
                                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                                placeholder="Dr. Jane Doe"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Title</label>
                                                <input
                                                    type="text"
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 py-2.5 bg-slate-50 focus:bg-white transition-colors"
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                    placeholder="Role Title"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                                                <input
                                                    type="text"
                                                    className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 py-2.5 bg-slate-50 focus:bg-white transition-colors"
                                                    value={formData.department}
                                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                                    placeholder="Focus Area"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50/80 backdrop-blur-sm px-6 py-5 flex flex-row-reverse gap-3 border-t border-slate-200">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-500 hover:shadow-indigo-300 transition-all sm:w-auto disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {loading ? 'Saving...' : 'Save Profile'}
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
