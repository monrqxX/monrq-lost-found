import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import LandingPage from './components/LandingPage'
import './styles/global.css'
import { AuthProvider, useAuth } from './hooks/useAuth'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ReportLost = lazy(() => import('./pages/ReportLost'))
const ReportFound = lazy(() => import('./pages/ReportFound'))
const Search = lazy(() => import('./pages/Search'))
const MyItems = lazy(() => import('./pages/MyItems'))
const ItemDetail = lazy(() => import('./pages/ItemDetail'))
const Matches = lazy(() => import('./pages/Matches'))
const MatchDetail = lazy(() => import('./pages/MatchDetail'))
const Claims = lazy(() => import('./pages/Claims'))
const Messages = lazy(() => import('./pages/Messages'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const Admin = lazy(() => import('./pages/Admin'))

const Fallback = () => <div style={{minHeight:'100vh',background:'#04060A',display:'grid',placeItems:'center',color:'#fff',fontFamily:'Inter,sans-serif'}}>Loading...</div>

function Login(){ return <Suspense fallback={<Fallback/>}><AuthRoute which="Login"/></Suspense> }
function Register(){ return <Suspense fallback={<Fallback/>}><AuthRoute which="Register"/></Suspense> }
function Forgot(){ return <Suspense fallback={<Fallback/>}><AuthRoute which="Forgot"/></Suspense> }
function VerifyEmail(){ return <Suspense fallback={<Fallback/>}><AuthRoute which="VerifyEmail"/></Suspense> }
function ResetPassword(){ return <Suspense fallback={<Fallback/>}><AuthRoute which="ResetPassword"/></Suspense> }
import { useEffect, useState } from 'react'
function AuthRoute({which}:{which:string}){
  const [C,setC]=useState<React.ComponentType|null>(null)
  useEffect(()=>{ import('./pages/AuthPages').then(m=>setC(()=>(m as Record<string,React.ComponentType>)[which])) },[which])
  if(!C) return <Fallback/>
  return <C/>
}
function Protected({children}:{children:React.ReactNode}){
  const {user,loading}=useAuth()
  if(loading) return <Fallback/>
  if(!user) return <Navigate to="/login" replace/>
  return <>{children}</>
}
function AuthCallbackRedirect(){
  const {user,loading,passwordRecovery,authEvent}=useAuth()
  const {pathname,search}=useLocation()
  const navigate=useNavigate()
  useEffect(()=>{
    const params=new URLSearchParams(search)
    const hasCode=params.has('code')
    const hasCallbackError=params.has('error')||params.has('error_description')

    if(pathname==='/reset-password'&&hasCode&&!hasCallbackError) return
    if(passwordRecovery||authEvent==='PASSWORD_RECOVERY'){
      if(pathname!=='/reset-password') navigate('/reset-password',{replace:true})
      return
    }
    if((!hasCode&&!hasCallbackError)||loading||(hasCode&&!authEvent)) return
    if(user){
      if(pathname!=='/dashboard') navigate('/dashboard',{replace:true})
      return
    }
    if(pathname!=='/login') navigate('/login',{replace:true,state:{authError:'This sign-in link expired or could not be verified. Request a fresh link and try again.'}})
  },[authEvent,loading,navigate,passwordRecovery,pathname,search,user])
  return null
}
export default function App(){
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthCallbackRedirect />
        <Suspense fallback={<Fallback/>}>
          <Routes>
            <Route path="/" element={<LandingPage/>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/register" element={<Register/>} />
            <Route path="/forgot-password" element={<Forgot/>} />
            <Route path="/verify-email" element={<VerifyEmail/>} />
            <Route path="/reset-password" element={<ResetPassword/>} />
            <Route path="/dashboard" element={<Protected><Dashboard/></Protected>} />
            <Route path="/lost" element={<Navigate to="/lost/new" replace/>} />
            <Route path="/lost/new" element={<Protected><ReportLost/></Protected>} />
            <Route path="/found" element={<Navigate to="/found/new" replace/>} />
            <Route path="/found/new" element={<Protected><ReportFound/></Protected>} />
            <Route path="/search" element={<Suspense fallback={<Fallback/>}><Search/></Suspense>} />
            <Route path="/items/:itemId" element={<Suspense fallback={<Fallback/>}><ItemDetail/></Suspense>} />
            <Route path="/my-items" element={<Protected><MyItems/></Protected>} />
            <Route path="/matches" element={<Protected><Matches/></Protected>} />
            <Route path="/matches/:matchId" element={<Protected><MatchDetail/></Protected>} />
            <Route path="/claims" element={<Protected><Claims/></Protected>} />
            <Route path="/claims/:claimId" element={<Protected><Claims/></Protected>} />
            <Route path="/messages" element={<Protected><Messages/></Protected>} />
            <Route path="/messages/:conversationId" element={<Protected><Messages/></Protected>} />
            <Route path="/notifications" element={<Protected><Notifications/></Protected>} />
            <Route path="/profile" element={<Protected><Profile/></Protected>} />
            <Route path="/settings" element={<Protected><Settings/></Protected>} />
            <Route path="/admin" element={<Protected><Admin/></Protected>} />
            <Route path="*" element={<Navigate to="/" replace/>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
