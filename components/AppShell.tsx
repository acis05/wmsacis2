"use client";import {usePathname} from 'next/navigation';import Sidebar from './Sidebar';
export default function AppShell({children}:{children:React.ReactNode}){const p=usePathname();const auth=p==='/login'||p==='/register';if(auth)return <div className="auth-shell">{children}</div>;return <div className="shell"><Sidebar/><main className="main">{children}</main></div>}
