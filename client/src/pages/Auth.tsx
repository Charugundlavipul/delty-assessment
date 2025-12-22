import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Activity, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react'

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLogin, setIsLogin] = useState(true)
    const navigate = useNavigate()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
                toast.success('Welcome back Doctor!')
                navigate('/')
            } else {
                const { error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
                toast.success('Verification link sent to your email.')
            }
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-indigo-600 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-blue-800 opacity-90" />
                <div className="absolute inset-0" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80")', backgroundSize: 'cover', backgroundBlendMode: 'overlay', opacity: '0.2' }}></div>
                <div className="relative z-10 flex flex-col justify-center px-12 text-white">
                    <div className="mb-8">
                        <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                            <Activity className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="text-5xl font-bold mb-6 font-display">MediTrack</h1>
                        <p className="text-xl text-indigo-100 max-w-md leading-relaxed">
                            Streamline your patient management with our secure, cloud-based platform designed for modern healthcare professionals.
                        </p>
                    </div>
                    <div className="flex gap-4 text-sm text-indigo-200 font-medium">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-white"></div>
                            HIPAA Compliant
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-white"></div>
                            Secure Encryption
                        </div>
                    </div>
                </div>
                {/* Abstract Shapes */}
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
                <div className="max-w-md w-full space-y-8 bg-white p-8 lg:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
                    <div className="text-center">
                        <div className="lg:hidden flex justify-center mb-4">
                            <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                                <Activity className="h-7 w-7 text-white" />
                            </div>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                            {isLogin ? 'Enter your credentials to access your dashboard' : 'Get started with your free secure account'}
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleAuth}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 transition-all duration-200"
                                        placeholder="doctor@hospital.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-slate-50 transition-all duration-200"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <span className="flex items-center">
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-slate-400">or</span>
                        </div>
                    </div>

                    <p className="text-center text-sm text-slate-600">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                        >
                            {isLogin ? 'Sign up for free' : 'Sign in here'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}
